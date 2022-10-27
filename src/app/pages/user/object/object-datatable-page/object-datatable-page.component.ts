import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Params } from '@angular/router';
import { marker as TEXT } from '@ngneat/transloco-keys-manager/marker';
import * as AWS from 'aws-sdk';
import * as _ from 'lodash';
import { BlockUI, NgBlockUI } from 'ng-block-ui';
import { finalize } from 'rxjs/operators';

import { format } from '~/app/functions.helper';
import { translate } from '~/app/i18n.helper';
import { ModalComponent } from '~/app/shared/components/modal/modal.component';
import { PageStatus } from '~/app/shared/components/page-status/page-status.component';
import { Icon } from '~/app/shared/enum/icon.enum';
import { DatatableActionItem } from '~/app/shared/models/datatable-action-item.type';
import {
  DatatableCellTemplateName,
  DatatableColumn
} from '~/app/shared/models/datatable-column.type';
import { DatatableData } from '~/app/shared/models/datatable-data.type';
import { BytesToSizePipe } from '~/app/shared/pipes/bytes-to-size.pipe';
import {
  S3BucketService,
  S3Object,
  S3Objects,
  S3UploadProgress
} from '~/app/shared/services/api/s3-bucket.service';
import { DialogService } from '~/app/shared/services/dialog.service';
import { NotificationService } from '~/app/shared/services/notification.service';

@Component({
  selector: 's3gw-object-datatable-page',
  templateUrl: './object-datatable-page.component.html',
  styleUrls: ['./object-datatable-page.component.scss']
})
export class ObjectDatatablePageComponent implements OnInit {
  @BlockUI()
  blockUI!: NgBlockUI;

  public bid: AWS.S3.Types.BucketName = '';
  public objects: S3Objects = [];
  public columns: DatatableColumn[];
  public icons = Icon;
  public pageStatus: PageStatus = PageStatus.none;

  private firstLoadComplete = false;

  constructor(
    private bytesToSizePipe: BytesToSizePipe,
    private dialogService: DialogService,
    private notificationService: NotificationService,
    private route: ActivatedRoute,
    private s3bucketService: S3BucketService
  ) {
    this.columns = [
      {
        name: TEXT('Name'),
        prop: 'Key'
      },
      {
        name: TEXT('Size'),
        prop: 'Size',
        pipe: this.bytesToSizePipe
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
  }

  ngOnInit(): void {
    this.route.params.subscribe((value: Params) => {
      if (!_.has(value, 'bid')) {
        this.pageStatus = PageStatus.ready;
        return;
      }
      this.bid = decodeURIComponent(value['bid']);
      this.loadData();
    });
  }

  loadData(): void {
    this.objects = [];
    if (!this.firstLoadComplete) {
      this.pageStatus = PageStatus.loading;
    }
    this.s3bucketService
      .listObjects(this.bid)
      .pipe(
        finalize(() => {
          this.firstLoadComplete = true;
        })
      )
      .subscribe({
        next: (objects: S3Objects) => {
          _.merge(this.objects, objects);
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

  onReload(): void {
    this.pageStatus = PageStatus.reloading;
    this.loadData();
  }

  onUpload(event: Event): void {
    const fileList: FileList = (event.target as any).files;
    this.blockUI.start(
      format(translate(TEXT('Please wait, uploading {{ total }} object(s) ({{ percent }}%) ...')), {
        total: fileList.length,
        percent: 0
      })
    );
    this.s3bucketService
      .uploadObjects(this.bid, fileList)
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
          this.onReload();
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

  onActionMenu(object: S3Object): DatatableActionItem[] {
    const result: DatatableActionItem[] = [
      {
        title: TEXT('Download'),
        icon: this.icons.download,
        callback: (data: DatatableData) => {
          this.s3bucketService.downloadObject(this.bid, object.Key!).subscribe();
        }
      },
      {
        type: 'divider'
      },
      {
        title: TEXT('Delete'),
        icon: this.icons.delete,
        callback: (data: DatatableData) => {
          this.dialogService.open(
            ModalComponent,
            (res: boolean) => {
              if (res) {
                this.blockUI.start(translate(TEXT('Please wait, deleting object ...')));
                this.s3bucketService
                  .deleteObject(this.bid, object.Key!)
                  .pipe(finalize(() => this.blockUI.stop()))
                  .subscribe(() => {
                    this.notificationService.showSuccess(TEXT(`Deleted object ${object.Key}.`));
                    this.onReload();
                  });
              }
            },
            {
              type: 'yesNo',
              icon: 'danger',
              message: format(
                TEXT(
                  'Do you really want to delete the object <strong>{{ key }}</strong> in the bucket <strong>{{ bucketName }}</strong>?'
                ),
                {
                  key: object.Key,
                  bucketName: this.bid
                }
              )
            }
          );
        }
      }
    ];
    return result;
  }
}
