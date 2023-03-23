import { Clipboard } from '@angular/cdk/clipboard';
import { Component, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { AbstractControl, AsyncValidatorFn, ValidationErrors } from '@angular/forms';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { marker as TEXT } from '@ngneat/transloco-keys-manager/marker';
import * as AWS from 'aws-sdk';
import * as _ from 'lodash';
import { BlockUI, NgBlockUI } from 'ng-block-ui';
import { forkJoin, merge, Observable, of, timer } from 'rxjs';
import { finalize, map, switchMap } from 'rxjs/operators';

import { bytesToSize, format } from '~/app/functions.helper';
import { translate } from '~/app/i18n.helper';
import { DeclarativeFormModalComponent } from '~/app/shared/components/declarative-form-modal/declarative-form-modal.component';
import { PageStatus } from '~/app/shared/components/page-wrapper/page-wrapper.component';
import { Icon } from '~/app/shared/enum/icon.enum';
import { S3gwValidators } from '~/app/shared/forms/validators';
import { Datatable } from '~/app/shared/models/datatable.interface';
import { DatatableAction } from '~/app/shared/models/datatable-action.type';
import {
  DatatableCellTemplateName,
  DatatableColumn
} from '~/app/shared/models/datatable-column.type';
import { DatatableData } from '~/app/shared/models/datatable-data.type';
import { DatatableRowAction } from '~/app/shared/models/datatable-row-action.type';
import {
  DeclarativeFormConfig,
  DeclarativeFormValues
} from '~/app/shared/models/declarative-form-config.type';
import { DeclarativeFormModalConfig } from '~/app/shared/models/declarative-form-modal-config.type';
import { PageAction } from '~/app/shared/models/page-action.type';
import { LocaleDatePipe } from '~/app/shared/pipes/locale-date.pipe';
import {
  S3BucketService,
  S3DeleteObjectOutput,
  S3GetObjectAttributesOutput,
  S3GetObjectOutput,
  S3Object,
  S3Objects,
  S3UploadProgress
} from '~/app/shared/services/api/s3-bucket.service';
import { DialogService } from '~/app/shared/services/dialog.service';
import { ModalDialogService } from '~/app/shared/services/modal-dialog.service';
import { NotificationService } from '~/app/shared/services/notification.service';
import { RxjsUiHelperService } from '~/app/shared/services/rxjs-ui-helper.service';

@Component({
  selector: 's3gw-object-datatable-page',
  templateUrl: './object-datatable-page.component.html',
  styleUrls: ['./object-datatable-page.component.scss']
})
export class ObjectDatatablePageComponent implements OnInit {
  @BlockUI()
  blockUI!: NgBlockUI;

  @ViewChild('nameColumnTpl', { static: true })
  nameColumnTpl?: TemplateRef<any>;

  public datatableActions: DatatableAction[];
  public bid: AWS.S3.Types.BucketName = '';
  public objects: S3Objects = [];
  public datatableColumns: DatatableColumn[] = [];
  public icons = Icon;
  public pageActions: PageAction[];
  public pageStatus: PageStatus = PageStatus.none;
  public prefixParts: string[] = [];
  public objectAttrsCache: Record<AWS.S3.Types.ObjectKey, Record<string, any>> = {};
  public loadingObjectAttrsKeys: AWS.S3.Types.ObjectKey[] = [];
  public expandedRowFormConfig: DeclarativeFormConfig;

  private firstLoadComplete = false;

  constructor(
    private clipboard: Clipboard,
    private dialogService: DialogService,
    private localeDatePipe: LocaleDatePipe,
    private modalDialogService: ModalDialogService,
    private notificationService: NotificationService,
    private route: ActivatedRoute,
    private router: Router,
    private rxjsUiHelperService: RxjsUiHelperService,
    private s3BucketService: S3BucketService
  ) {
    this.datatableActions = [
      {
        type: 'button',
        text: TEXT('Folder'),
        icon: this.icons.folderPlus,
        callback: (event: Event) => this.doCreateFolder()
      },
      {
        type: 'file',
        text: TEXT('Upload'),
        icon: this.icons.upload,
        callback: (event: Event) => this.doUpload((event.target as HTMLInputElement).files)
      },
      {
        type: 'button',
        text: TEXT('Download'),
        icon: this.icons.download,
        enabledConstraints: {
          minSelected: 1
        },
        callback: (event: Event, table: Datatable) => this.doDownload(table.selected)
      },
      {
        type: 'button',
        text: TEXT('Delete'),
        icon: this.icons.delete,
        enabledConstraints: {
          minSelected: 1
        },
        callback: (event: Event, table: Datatable) => this.doDelete(table.selected)
      }
    ];
    this.pageActions = [
      {
        type: 'button',
        text: TEXT('Edit'),
        icon: Icon.edit,
        callback: () => this.router.navigate([`/buckets/edit/${this.bid}`])
      }
    ];
    this.expandedRowFormConfig = {
      fields: [
        {
          type: 'text',
          name: 'Key',
          label: TEXT('Key'),
          readonly: true
        },
        {
          type: 'text',
          name: 'Size',
          label: TEXT('Size'),
          readonly: true
        },
        {
          type: 'text',
          name: 'LastModified',
          label: TEXT('Last Modified'),
          readonly: true
        },
        {
          type: 'text',
          name: 'ETag',
          label: TEXT('ETag'),
          readonly: true
        },
        {
          type: 'select',
          name: 'ObjectLockLegalHoldStatus',
          label: TEXT('Legal Hold'),
          options: {
            /* eslint-disable @typescript-eslint/naming-convention */
            ON: TEXT('On'),
            OFF: TEXT('Off')
            /* eslint-enable @typescript-eslint/naming-convention */
          }
        },
        {
          type: 'select',
          name: 'ObjectLockMode',
          label: TEXT('Retention Mode'),
          readonly: true,
          options: {
            /* eslint-disable @typescript-eslint/naming-convention */
            NONE: TEXT('None'),
            GOVERNANCE: TEXT('Governance'),
            COMPLIANCE: TEXT('Compliance')
            /* eslint-enable @typescript-eslint/naming-convention */
          }
        },
        {
          type: 'text',
          name: 'ObjectLockRetainUntilDate',
          label: TEXT('Retain Until'),
          readonly: true
        },
        {
          type: 'text',
          name: 'ContentType',
          label: TEXT('Content-Type'),
          readonly: true
        }
      ],
      buttons: [
        {
          type: 'submit',
          text: TEXT('Update'),
          click: (buttonConfig, values: Record<string, any>): void => {
            this.s3BucketService
              .setObjectLegalHold(this.bid, values['Key'], values['ObjectLockLegalHoldStatus'])
              .subscribe(() => {
                this.notificationService.showSuccess(
                  format(translate(TEXT('The object {{ key }} has been updated.')), {
                    key: values['Key']
                  })
                );
              });
          }
        }
      ]
    };
  }

  get delimiter(): string {
    return this.s3BucketService.delimiter;
  }

  ngOnInit(): void {
    this.datatableColumns = [
      {
        name: TEXT('Name'),
        prop: 'Name',
        css: 'text-break',
        cellTemplate: this.nameColumnTpl
      },
      {
        name: TEXT('Key'),
        prop: 'Key',
        css: 'text-break',
        hidden: true,
        cellTemplateName: DatatableCellTemplateName.copyToClipboard
      },
      {
        name: TEXT('Size'),
        prop: 'Size',
        cellTemplateName: DatatableCellTemplateName.binaryUnit
      },
      {
        name: TEXT('Last Modified'),
        prop: 'LastModified',
        cellTemplateName: DatatableCellTemplateName.localeDateTime
      },
      {
        name: '',
        prop: '',
        cellTemplateName: DatatableCellTemplateName.actionMenu,
        cellTemplateConfig: this.onActionMenu.bind(this)
      }
    ];
    this.route.params.subscribe((value: Params) => {
      if (!_.has(value, 'bid')) {
        this.pageStatus = PageStatus.ready;
        return;
      }
      this.bid = decodeURIComponent(value['bid']);
    });
  }

  loadData(): void {
    this.objects = [];
    this.objectAttrsCache = {};
    this.pageStatus = !this.firstLoadComplete ? PageStatus.loading : PageStatus.reloading;
    this.s3BucketService
      .listObjects(this.bid, this.s3BucketService.buildPrefix(this.prefixParts, true))
      .pipe(
        finalize(() => {
          this.firstLoadComplete = true;
        })
      )
      .subscribe({
        next: (objects: S3Objects) => {
          this.objects = [...this.objects, ...objects];
        },
        complete: () => {
          this.pageStatus = PageStatus.ready;
        },
        error: () => {
          this.objects = [];
          this.pageStatus = PageStatus.loadingError;
        }
      });
  }

  onPrefixSelect(index: number): void {
    this.prefixParts = this.prefixParts.slice(0, index);
    this.loadData();
  }

  onRowSelection(event: any): void {
    const [row, column] = [...event] as [S3Object, DatatableColumn];
    // Process row selection if:
    // - it's a folder
    // - the action or checkbox column is not clicked
    if ('FOLDER' === row.Type && '' !== column.name) {
      this.prefixParts = this.s3BucketService.splitKey(row.Key!);
      this.loadData();
    }
  }

  onActionMenu(object: S3Object): DatatableRowAction[] {
    const result: DatatableRowAction[] = [];
    if ('OBJECT' === object.Type) {
      result.push(
        {
          title: TEXT('Download'),
          icon: this.icons.download,
          callback: (data: DatatableData) => this.doDownload([data])
        },
        {
          type: 'divider'
        },
        {
          title: TEXT('Delete'),
          icon: this.icons.delete,
          callback: (data: DatatableData) => this.doDelete([data])
        }
      );
    } else {
      result.push({
        title: TEXT('Delete'),
        icon: this.icons.delete,
        callback: (data: DatatableData) => this.doDelete([data])
      });
    }
    return result;
  }

  onCopyPrefixToClipboard(): void {
    const prefix: string = this.s3BucketService.buildPrefix(this.prefixParts);
    const success = this.clipboard.copy(prefix);
    if (success) {
      this.notificationService.showSuccess(TEXT('Successfully copied path to the clipboard.'));
    } else {
      this.notificationService.showError(TEXT('Failed to copy path to the clipboard.'));
    }
  }

  isExpandableRow(): (data: DatatableData) => boolean {
    return (data: DatatableData): boolean => (data as S3Object).Type === 'OBJECT';
  }

  onExpandedRowsChange(event: any): void {
    this.loadingObjectAttrsKeys = [];
    const objects: S3Objects = event as S3Objects;
    const sources: Observable<S3GetObjectAttributesOutput>[] = [];
    _.forEach(objects, (object: S3Object) => {
      const key: AWS.S3.Types.ObjectKey = object.Key!;
      // Only load the object attributes of those rows that haven't been
      // loaded yet.
      if (!_.has(this.objectAttrsCache, key)) {
        this.loadingObjectAttrsKeys.push(key);
        sources.push(this.s3BucketService.getObjectAttributes(this.bid, key));
      }
    });
    forkJoin(sources)
      .pipe(finalize(() => (this.loadingObjectAttrsKeys = [])))
      .subscribe((objAttrs: S3GetObjectAttributesOutput[]) => {
        // Append the data of those expanded rows that haven't been
        // loaded yet.
        _.forEach(objAttrs, (objAttr: Record<string, any>) => {
          const object: S3Object | undefined = _.find(objects, ['Key', objAttr['Key']]);
          if (object) {
            // Append modified (transformed) data.
            _.merge(objAttr, {
              /* eslint-disable @typescript-eslint/naming-convention */
              Size: bytesToSize(object.Size),
              LastModified: this.localeDatePipe.transform(object.LastModified!, 'datetime'),
              ETag: _.trim(objAttr['ETag'], '"'),
              ObjectLockMode: _.defaultTo(objAttr['ObjectLockMode'], 'NONE'),
              ObjectLockRetainUntilDate: this.localeDatePipe.transform(
                _.defaultTo(objAttr['ObjectLockRetainUntilDate'], ''),
                'datetime'
              ),
              ObjectLockLegalHoldStatus: _.defaultTo(objAttr['ObjectLockLegalHoldStatus'], 'OFF')
              /* eslint-enable @typescript-eslint/naming-convention */
            });
          }
          this.objectAttrsCache[objAttr['Key']] = objAttr;
        });
        // Purge collapsed rows.
        this.objectAttrsCache = _.pickBy(
          this.objectAttrsCache,
          (value, key: AWS.S3.Types.ObjectKey) => {
            return 0 <= _.findIndex(objects, ['Key', key]);
          }
        );
      });
  }

  private doDownload(selected: DatatableData[]): void {
    const sources: Observable<S3GetObjectOutput>[] = [];
    _.forEach(selected, (data: DatatableData) =>
      sources.push(this.s3BucketService.downloadObject(this.bid, data['Key']))
    );
    // Download the files in parallel.
    merge(...sources).subscribe();
  }

  private doUpload(fileList: FileList | null): void {
    if (!fileList) {
      return;
    }
    this.blockUI.start(
      format(translate(TEXT('Please wait, uploading {{ total }} object(s) ...')), {
        total: fileList.length
      })
    );
    this.s3BucketService
      .uploadObjects(this.bid, fileList, this.s3BucketService.buildPrefix(this.prefixParts))
      .pipe(finalize(() => this.blockUI.stop()))
      .subscribe({
        next: (progress: S3UploadProgress) => {
          this.blockUI.update(
            format(
              translate(
                TEXT(
                  'Please wait, uploading {{ loaded }} of {{ total }} object(s) ({{ percent }}%) ...'
                )
              ),
              {
                loaded: progress.loaded,
                total: progress.total,
                percent: Math.round((Number(progress.loaded) / Number(progress.total)) * 100)
              }
            )
          );
        },
        complete: () => {
          this.notificationService.showSuccess(
            format(translate(TEXT('{{ total }} object(s) have been successfully uploaded.')), {
              total: fileList.length
            })
          );
          this.loadData();
        },
        error: (err: Error) => {
          this.notificationService.showError(
            format(translate(TEXT('Failed to upload the objects: {{ error }}')), {
              error: err.message
            })
          );
        }
      });
  }

  private doDelete(selected: DatatableData[]): void {
    this.modalDialogService.confirmDeletion<S3Object>(
      selected as S3Object[],
      'danger',
      {
        singular: TEXT('Do you really want to delete the object <strong>{{ name }}</strong>?'),
        singularFmtArgs: (value: S3Object) => ({ name: value.Key }),
        plural: TEXT('Do you really want to delete these <strong>{{ count }}</strong> objects?')
      },
      () => {
        const sources: Observable<S3DeleteObjectOutput>[] = [];
        _.forEach(selected, (data: DatatableData) => {
          switch (data['Type']) {
            case 'FOLDER':
              sources.push(this.s3BucketService.deleteObjects(this.bid, data['Key']));
              break;
            case 'OBJECT':
              sources.push(this.s3BucketService.deleteObject(this.bid, data['Key']));
              break;
          }
        });
        this.rxjsUiHelperService
          .concat<S3DeleteObjectOutput>(
            sources,
            {
              start: TEXT('Please wait, deleting {{ total }} object(s) ...'),
              next: TEXT(
                'Please wait, deleting object {{ current }} of {{ total }} ({{ percent }}%) ...'
              )
            },
            {
              next: TEXT('Object {{ name }} has been deleted.'),
              nextFmtArgs: (output: S3DeleteObjectOutput) => ({ name: output.Key })
            }
          )
          .subscribe({
            complete: () => this.loadData()
          });
      }
    );
  }

  private doCreateFolder(): void {
    this.dialogService.open(
      DeclarativeFormModalComponent,
      (result: DeclarativeFormValues | boolean) => {
        if (result !== false) {
          const values = result as DeclarativeFormValues;
          const newPathParts = this.s3BucketService.splitKey(values['path']);
          this.prefixParts.push(...newPathParts);
          this.objects = [];
        }
      },
      {
        formConfig: {
          title: TEXT('Create a new folder'),
          fields: [
            {
              type: 'text',
              name: 'path',
              label: TEXT('Path'),
              value: '',
              validators: {
                required: true,
                custom: S3gwValidators.objectKey(),
                asyncCustom: this.uniqueObjectKey()
              }
            }
          ]
        },
        submitButtonText: TEXT('Create')
      } as DeclarativeFormModalConfig
    );
  }

  private uniqueObjectKey(): AsyncValidatorFn {
    return (control: AbstractControl): Observable<ValidationErrors | null> => {
      if (control.pristine || _.isEmpty(control.value)) {
        return of(null);
      }
      const key = this.s3BucketService.buildKey(control.value, this.prefixParts);
      return timer(200).pipe(
        switchMap(() => this.s3BucketService.existsObject(this.bid, key)),
        map((resp: boolean) => {
          if (!resp) {
            return null;
          } else {
            return { custom: TEXT('The path already exists.') };
          }
        })
      );
    };
  }
}
