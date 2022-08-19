import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { marker as TEXT } from '@ngneat/transloco-keys-manager/marker';
import { BlockUI, NgBlockUI } from 'ng-block-ui';
import { finalize } from 'rxjs/operators';

import { translate } from '~/app/i18n.helper';
import { ModelComponent } from '~/app/shared/components/modal/model.component';
import { PageStatus } from '~/app/shared/components/page-status/page-status.component';
import { Icon } from '~/app/shared/enum/icon.enum';
import { DatatableActionItem } from '~/app/shared/models/datatable-action-item.type';
import {
  DatatableCellTemplateName,
  DatatableColumn
} from '~/app/shared/models/datatable-column.type';
import { DatatableData } from '~/app/shared/models/datatable-data.type';
import { Bucket, BucketService } from '~/app/shared/services/api/bucket.service';
import { DialogService } from '~/app/shared/services/dialog.service';
import { NotificationService } from '~/app/shared/services/notification.service';

@Component({
  selector: 's3gw-bucket-datatable-page',
  templateUrl: './bucket-datatable-page.component.html',
  styleUrls: ['./bucket-datatable-page.component.scss']
})
export class BucketDatatablePageComponent {
  @BlockUI()
  blockUI!: NgBlockUI;

  public buckets: Bucket[] = [];
  public columns: DatatableColumn[];
  public icons = Icon;
  public pageStatus: PageStatus = PageStatus.none;

  private firstLoadComplete = false;

  constructor(
    private bucketService: BucketService,
    private dialogService: DialogService,
    private notificationService: NotificationService,
    private router: Router
  ) {
    this.columns = [
      {
        name: TEXT('Name'),
        prop: 'bucket'
      },
      {
        name: TEXT('Owner'),
        prop: 'owner'
      },
      {
        name: TEXT('Created'),
        prop: 'creation_time',
        cellTemplateName: DatatableCellTemplateName.localeDateTime
      },
      {
        name: TEXT('Last Modified'),
        prop: 'mtime',
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
    if (!this.firstLoadComplete) {
      this.pageStatus = PageStatus.loading;
    }
    this.bucketService
      .list(true)
      .pipe(
        finalize(() => {
          this.firstLoadComplete = true;
        })
      )
      .subscribe({
        next: (buckets: Bucket[]) => {
          this.buckets = buckets;
          this.pageStatus = PageStatus.ready;
        },
        error: () => {
          this.buckets = [];
          this.pageStatus = PageStatus.loadingError;
        }
      });
  }

  onReload(): void {
    this.pageStatus = PageStatus.reloading;
    this.loadData();
  }

  onCreate(): void {
    this.router.navigate(['/bucket/create/']);
  }

  onActionMenu(bucket: Bucket): DatatableActionItem[] {
    const result: DatatableActionItem[] = [
      {
        title: TEXT('Edit'),
        icon: this.icons.edit,
        callback: (data: DatatableData) => {
          this.router.navigate([`/bucket/edit/${bucket.bucket}`]);
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
            ModelComponent,
            (res: boolean) => {
              if (res) {
                this.blockUI.start(translate(TEXT('Please wait, deleting bucket ...')));
                this.bucketService
                  .delete(bucket.bucket)
                  .pipe(finalize(() => this.blockUI.stop()))
                  .subscribe(() => {
                    this.notificationService.showSuccess(TEXT(`Deleted bucket ${bucket.bucket}.`));
                    this.loadData();
                  });
              }
            },
            {
              type: 'yesNo',
              icon: 'danger',
              message: TEXT(
                `Do you really want to delete the bucket <strong>${bucket.bucket}</strong>?`
              )
            }
          );
        }
      }
    ];
    return result;
  }
}
