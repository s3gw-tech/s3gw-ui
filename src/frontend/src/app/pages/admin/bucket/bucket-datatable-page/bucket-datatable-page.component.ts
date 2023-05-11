import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { marker as TEXT } from '@ngneat/transloco-keys-manager/marker';
import * as _ from 'lodash';
import { EMPTY, Observable, throwError } from 'rxjs';
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
import { AdminOpsBucketService, Bucket } from '~/app/shared/services/api/admin-ops-bucket.service';
import { ModalDialogService } from '~/app/shared/services/modal-dialog.service';
import { NotificationService } from '~/app/shared/services/notification.service';
import { RxjsUiHelperService } from '~/app/shared/services/rxjs-ui-helper.service';

@Component({
  selector: 's3gw-bucket-datatable-page',
  templateUrl: './bucket-datatable-page.component.html',
  styleUrls: ['./bucket-datatable-page.component.scss']
})
export class BucketDatatablePageComponent {
  public buckets: Bucket[] = [];
  public datatableActions: DatatableAction[];
  public datatableColumns: DatatableColumn[];
  public icons = Icon;
  public pageActions: PageAction[];
  public pageStatus: PageStatus = PageStatus.none;

  private firstLoadComplete = false;

  constructor(
    private bucketService: AdminOpsBucketService,
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
        prop: 'bucket',
        css: 'text-break'
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
    this.pageActions = [
      {
        type: 'button',
        text: TEXT('Create'),
        icon: this.icons.create,
        callback: () => this.router.navigate(['/admin/buckets/create'])
      }
    ];
  }

  loadData(): void {
    this.pageStatus = !this.firstLoadComplete ? PageStatus.loading : PageStatus.reloading;
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

  private onActionMenu(bucket: Bucket): DatatableRowAction[] {
    const result: DatatableRowAction[] = [
      {
        title: TEXT('Edit'),
        icon: this.icons.edit,
        callback: () => {
          this.router.navigate([`/admin/buckets/edit/${bucket.bucket}`]);
        }
      },
      {
        title: TEXT('Lifecycle'),
        icon: 'mdi mdi-clock-end',
        callback: () => {
          this.router.navigate([`/admin/buckets/lifecycle/${bucket.bucket}`]);
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
    this.modalDialogService.confirmDeletion<Bucket>(
      selected as Bucket[],
      'danger',
      {
        singular: TEXT('Do you really want to delete the bucket <strong>{{ name }}</strong>?'),
        singularFmtArgs: (value: Bucket) => ({ name: value.bucket }),
        plural: TEXT('Do you really want to delete these <strong>{{ count }}</strong> buckets?')
      },
      () => {
        this.modalDialogService.yesNo(
          TEXT('Do you want to remove the buckets objects before deletion?'),
          (purgeObjects: boolean) => {
            const sources: Observable<string>[] = [];
            _.forEach(selected, (data: DatatableData) => {
              sources.push(
                this.bucketService.delete(data['bucket'], purgeObjects).pipe(
                  catchError((err) => {
                    if (err.error?.Code === 'BucketNotEmpty') {
                      err.preventDefault?.();
                      this.notificationService.showError(
                        format(TEXT('The bucket {{ name }} is not empty.'), {
                          name: data['bucket']
                        }),
                        TEXT('Delete bucket')
                      );
                      return EMPTY;
                    }
                    return throwError(err);
                  })
                )
              );
            });
            this.rxjsUiHelperService
              .concat<string>(
                sources,
                {
                  start: TEXT('Please wait, deleting {{ total }} bucket(s) ...'),
                  next: TEXT(
                    'Please wait, deleting bucket {{ current }} of {{ total }} ({{ percent }}%) ...'
                  )
                },
                {
                  next: TEXT('Bucket {{ name }} has been deleted.'),
                  nextFmtArgs: (name: string) => ({ name })
                }
              )
              .subscribe({
                complete: () => this.loadData()
              });
          }
        );
      }
    );
  }
}
