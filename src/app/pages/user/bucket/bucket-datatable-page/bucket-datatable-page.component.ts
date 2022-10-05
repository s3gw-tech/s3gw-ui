import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { marker as TEXT } from '@ngneat/transloco-keys-manager/marker';
import { BlockUI, NgBlockUI } from 'ng-block-ui';
import { finalize } from 'rxjs/operators';

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
import { S3Bucket, S3BucketService } from '~/app/shared/services/api/s3-bucket.service';
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

  public buckets: S3Bucket[] = [];
  public columns: DatatableColumn[];
  public icons = Icon;
  public pageStatus: PageStatus = PageStatus.none;

  private firstLoadComplete = false;

  constructor(
    private s3bucketService: S3BucketService,
    private dialogService: DialogService,
    private notificationService: NotificationService,
    private router: Router
  ) {
    this.columns = [
      {
        name: TEXT('Name'),
        prop: 'Name'
      },
      {
        name: TEXT('Created'),
        prop: 'CreationDate',
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
    this.s3bucketService
      .list()
      .pipe(
        finalize(() => {
          this.firstLoadComplete = true;
        })
      )
      .subscribe({
        next: (buckets: S3Bucket[]) => {
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
    this.router.navigate(['/user/buckets/create/']);
  }

  onActionMenu(bucket: S3Bucket): DatatableActionItem[] {
    const result: DatatableActionItem[] = [
      {
        title: TEXT('Edit'),
        icon: this.icons.edit,
        callback: (data: DatatableData) => {
          this.router.navigate([`/user/buckets/edit/${bucket.Name}`]);
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
                this.blockUI.start(translate(TEXT('Please wait, deleting bucket ...')));
                this.s3bucketService
                  .delete(bucket.Name)
                  .pipe(finalize(() => this.blockUI.stop()))
                  .subscribe(() => {
                    this.notificationService.showSuccess(TEXT(`Deleted bucket ${bucket.Name}.`));
                    this.onReload();
                  });
              }
            },
            {
              type: 'yesNo',
              icon: 'danger',
              message: TEXT(
                `Do you really want to delete the bucket <strong>${bucket.Name}</strong>?`
              )
            }
          );
        }
      }
    ];
    return result;
  }
}
