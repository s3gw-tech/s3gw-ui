import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { marker as TEXT } from '@ngneat/transloco-keys-manager/marker';
import * as _ from 'lodash';
import { Observable, throwError } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';

import { format } from '~/app/functions.helper';
import { PageStatus } from '~/app/shared/components/page-wrapper/page-wrapper.component';
import { Icon } from '~/app/shared/enum/icon.enum';
import { Datatable } from '~/app/shared/models/datatable.interface';
import { DatatableAction } from '~/app/shared/models/datatable-action.type';
import {
  DatatableCellTemplateName,
  DatatableColumn
} from '~/app/shared/models/datatable-column.type';
import { DatatableData } from '~/app/shared/models/datatable-data.type';
import { DatatableRowAction } from '~/app/shared/models/datatable-row-action.type';
import { PageAction } from '~/app/shared/models/page-action.type';
import {
  S3Bucket,
  S3BucketName,
  S3Buckets,
  S3BucketService
} from '~/app/shared/services/api/s3-bucket.service';
import { ModalDialogService } from '~/app/shared/services/modal-dialog.service';
import { NotificationService } from '~/app/shared/services/notification.service';
import { RxjsUiHelperService } from '~/app/shared/services/rxjs-ui-helper.service';

@Component({
  selector: 's3gw-bucket-datatable-page',
  templateUrl: './bucket-datatable-page.component.html',
  styleUrls: ['./bucket-datatable-page.component.scss']
})
export class BucketDatatablePageComponent {
  public buckets: S3Buckets = [];
  public datatableActions: DatatableAction[];
  public datatableColumns: DatatableColumn[];
  public icons = Icon;
  public pageActions: PageAction[];
  public pageStatus: PageStatus = PageStatus.none;

  private firstLoadComplete = false;

  constructor(
    private s3bucketService: S3BucketService,
    private modalDialogService: ModalDialogService,
    private notificationService: NotificationService,
    private router: Router,
    private rxjsUiHelperService: RxjsUiHelperService
  ) {
    this.datatableActions = [
      {
        type: 'button',
        text: TEXT('Delete'),
        icon: this.icons.delete,
        enabledConstraints: {
          minSelected: 1
        },
        callback: (event: Event, action: DatatableAction, table: Datatable) =>
          this.doDelete(table.selected)
      }
    ];
    this.datatableColumns = [
      {
        name: TEXT('Name'),
        prop: 'Name',
        css: 'text-break'
      },
      {
        name: TEXT('Created'),
        prop: 'CreationDate',
        cellTemplateName: DatatableCellTemplateName.localeDateTime
      },
      {
        name: '',
        prop: '',
        cellTemplateName: DatatableCellTemplateName.button,
        cellTemplateConfig: {
          text: TEXT('Explore'),
          class: 'btn-outline-primary',
          url: '/objects/{{ Name }}'
        }
      },
      {
        name: '',
        prop: '',
        cellTemplateName: DatatableCellTemplateName.actionMenu,
        cellTemplateConfig: this.onActionMenu.bind(this)
      }
    ];
    this.pageActions = [
      {
        type: 'button',
        text: TEXT('Create'),
        callback: () => this.router.navigate(['/buckets/create'])
      }
    ];
  }

  loadData(): void {
    this.pageStatus = !this.firstLoadComplete ? PageStatus.loading : PageStatus.reloading;
    this.s3bucketService
      .list()
      .pipe(
        finalize(() => {
          this.firstLoadComplete = true;
        })
      )
      .subscribe({
        next: (buckets: S3Buckets) => {
          this.buckets = buckets;
          this.pageStatus = PageStatus.ready;
        },
        error: () => {
          this.buckets = [];
          this.pageStatus = PageStatus.loadingError;
        }
      });
  }

  private onActionMenu(bucket: S3Bucket): DatatableRowAction[] {
    const result: DatatableRowAction[] = [
      {
        title: TEXT('Edit'),
        icon: this.icons.edit,
        callback: () => {
          this.router.navigate([`/buckets/edit/${bucket.Name}`]);
        }
      },
      {
        title: TEXT('Lifecycle'),
        icon: 'mdi mdi-clock-end',
        callback: () => {
          this.router.navigate([`/buckets/lifecycle/${bucket.Name}`]);
        }
      },
      {
        type: 'divider'
      },
      {
        title: TEXT('Delete'),
        icon: this.icons.delete,
        callback: (data: DatatableData) => this.doDelete([data])
      }
    ];
    return result;
  }

  private doDelete(selected: DatatableData[]): void {
    this.modalDialogService.confirmDeletion<S3Bucket>(
      selected as S3Bucket[],
      {
        singular: TEXT('Do you really want to delete the bucket <strong>{{ name }}</strong>?'),
        singularFmtArgs: (value: S3Bucket) => ({ name: value.Name }),
        plural: TEXT('Do you really want to delete these <strong>{{ count }}</strong> buckets?')
      },
      () => {
        const sources: Observable<S3BucketName>[] = [];
        _.forEach(selected, (data: DatatableData) => {
          sources.push(
            this.s3bucketService.delete(data['Name']).pipe(
              catchError((err) => {
                if (err.code === 'BucketNotEmpty') {
                  this.notificationService.showError(
                    format(TEXT('The bucket {{ name }} is not empty.'), { name: data['Name'] }),
                    TEXT('Delete bucket')
                  );
                }
                return throwError(err);
              })
            )
          );
        });
        this.rxjsUiHelperService
          .concat<S3BucketName>(
            sources,
            {
              start: TEXT('Please wait, deleting {{ total }} bucket(s) ...'),
              next: TEXT(
                'Please wait, deleting bucket {{ current }} of {{ total }} ({{ percent }}%) ...'
              )
            },
            {
              next: TEXT('Bucket {{ name }} has been deleted.'),
              nextFmtArgs: (name: S3BucketName) => ({ name })
            }
          )
          .subscribe({
            complete: () => this.loadData(),
            error: () => this.loadData()
          });
      }
    );
  }
}
