import { Component, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { ActivatedRoute, Params } from '@angular/router';
import { marker as TEXT } from '@ngneat/transloco-keys-manager/marker';
import * as AWS from 'aws-sdk';
import * as _ from 'lodash';
import { Subscription } from 'rxjs';
import { finalize } from 'rxjs/operators';

import { format } from '~/app/functions.helper';
import { Unsubscribe } from '~/app/functions.helper';
import { PageStatus } from '~/app/shared/components/page-wrapper/page-wrapper.component';
import { Icon } from '~/app/shared/enum/icon.enum';
import { Datatable } from '~/app/shared/models/datatable.interface';
import { DatatableAction } from '~/app/shared/models/datatable-action.type';
import {
  DatatableCellTemplateName,
  DatatableColumn
} from '~/app/shared/models/datatable-column.type';
import { DatatableRowAction } from '~/app/shared/models/datatable-row-action.type';
import { PageAction } from '~/app/shared/models/page-action.type';
import {
  S3BucketService,
  S3ObjectVersion,
  S3ObjectVersionList
} from '~/app/shared/services/api/s3-bucket.service';
import { BlockUiService } from '~/app/shared/services/block-ui.service';
import { ModalDialogService } from '~/app/shared/services/modal-dialog.service';

@Component({
  selector: 's3gw-object-version-datatable-page',
  templateUrl: './object-version-datatable-page.component.html',
  styleUrls: ['./object-version-datatable-page.component.scss']
})
export class ObjectVersionDatatablePageComponent implements OnInit {
  @ViewChild('customColumnTpl', { static: true })
  customColumnTpl?: TemplateRef<any>;

  @Unsubscribe()
  private subscriptions: Subscription = new Subscription();

  public bid: AWS.S3.Types.BucketName = '';
  public prefix: AWS.S3.Types.Prefix = '';
  public objects: S3ObjectVersionList = [];
  public datatableActions: DatatableAction[] = [];
  public datatableColumns: DatatableColumn[] = [];
  public pageActions: PageAction[] = [];
  public pageStatus: PageStatus = PageStatus.none;
  public icons = Icon;

  constructor(
    private route: ActivatedRoute,
    private blockUiService: BlockUiService,
    private modalDialogService: ModalDialogService,
    private s3BucketService: S3BucketService
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe((value: Params) => {
      if (!_.has(value, 'bid')) {
        this.pageStatus = PageStatus.ready;
        return;
      }
      this.bid = decodeURIComponent(value['bid']);
      this.prefix = decodeURIComponent(value['prefix']);
      this.loadData();
    });
    this.datatableActions = [
      {
        type: 'button',
        text: TEXT('Download'),
        icon: this.icons.download,
        enabledConstraints: {
          minSelected: 1
        },
        callback: (event: Event, action: DatatableAction, table: Datatable) =>
          this.doDownload(table.selected[0] as S3ObjectVersion)
      },
      {
        type: 'button',
        text: TEXT('Restore'),
        icon: this.icons.restore,
        enabledConstraints: {
          minSelected: 1
        },
        callback: (event: Event, action: DatatableAction, table: Datatable) =>
          this.doRestore(table.selected[0] as S3ObjectVersion)
      }
    ];
    this.datatableColumns = [
      {
        name: TEXT('Version'),
        prop: 'LastModified',
        cellTemplate: this.customColumnTpl
      },
      {
        name: TEXT('Latest'),
        prop: 'IsLatest',
        cellTemplateName: DatatableCellTemplateName.badge,
        cellTemplateConfig: {
          map: {
            /* eslint-disable @typescript-eslint/naming-convention */
            false: { value: '' },
            true: { value: TEXT('Latest'), class: 'badge-outline success' }
            /* eslint-enable @typescript-eslint/naming-convention */
          }
        }
      },
      {
        name: TEXT('Version ID'),
        prop: 'VersionId',
        css: 'text-break',
        cellTemplateName: DatatableCellTemplateName.copyToClipboard
      },
      {
        name: TEXT('ETag'),
        prop: 'ETag',
        hidden: true,
        css: 'text-break',
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
  }

  loadData(): void {
    this.objects = [];
    this.pageStatus = PageStatus.loading;
    this.subscriptions.add(
      this.s3BucketService.listObjectVersions(this.bid, this.prefix).subscribe({
        next: (objects: S3ObjectVersionList) => {
          this.objects = [...this.objects, ...objects];
        },
        complete: () => {
          this.pageStatus = PageStatus.ready;
        },
        error: () => {
          this.objects = [];
          this.pageStatus = PageStatus.loadingError;
        }
      })
    );
  }

  onActionMenu(object: S3ObjectVersion): DatatableRowAction[] {
    const result: DatatableRowAction[] = [
      {
        title: TEXT('Download'),
        icon: this.icons.download,
        disabled: object.IsDeleted,
        callback: () => this.doDownload(object)
      },
      {
        title: TEXT('Restore'),
        icon: this.icons.restore,
        disabled: object.IsDeleted || object.IsLatest,
        callback: () => this.doRestore(object)
      }
    ];
    return result;
  }

  private doDownload(object: S3ObjectVersion): void {
    this.subscriptions.add(
      this.s3BucketService.downloadObject(this.bid, object.Key!, object.VersionId!).subscribe()
    );
  }

  private doRestore(object: S3ObjectVersion): void {
    this.modalDialogService.yesNo(
      format(
        TEXT(
          'Are you sure you want to restore the following object?<br>Key: <strong>{{ key | reverse | truncate(45) | reverse }}</strong><br>Version ID: <strong>{{ versionId }}</strong>'
        ),
        {
          key: object.Key,
          versionId: object.VersionId
        }
      ),
      (restore: boolean) => {
        if (!restore) {
          return;
        }
        this.blockUiService.start(TEXT('Please wait, restoring object...'));
        this.subscriptions.add(
          this.s3BucketService
            .restoreObject(this.bid, object.Key!, object.VersionId!)
            .pipe(finalize(() => this.blockUiService.stop()))
            .subscribe(() => this.loadData())
        );
      }
    );
  }
}
