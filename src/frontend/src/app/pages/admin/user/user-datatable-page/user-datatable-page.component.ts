import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { marker as TEXT } from '@ngneat/transloco-keys-manager/marker';
import * as _ from 'lodash';
import { BlockUI, NgBlockUI } from 'ng-block-ui';
import { Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';

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
import { AdminOpsUserService, User } from '~/app/shared/services/api/admin-ops-user.service';
import { AuthSessionService } from '~/app/shared/services/auth-session.service';
import { ModalDialogService } from '~/app/shared/services/modal-dialog.service';
import { NotificationService } from '~/app/shared/services/notification.service';
import { RxjsUiHelperService } from '~/app/shared/services/rxjs-ui-helper.service';

@Component({
  selector: 's3gw-user-datatable-page',
  templateUrl: './user-datatable-page.component.html',
  styleUrls: ['./user-datatable-page.component.scss']
})
export class UserDatatablePageComponent {
  @BlockUI()
  blockUI!: NgBlockUI;

  public datatableActions: DatatableAction[];
  public datatableColumns: DatatableColumn[];
  public icons = Icon;
  public pageActions: PageAction[];
  public pageStatus: PageStatus = PageStatus.none;
  public users: Record<string, any>[] = [];

  private firstLoadComplete = false;

  constructor(
    private authSessionService: AuthSessionService,
    private modalDialogService: ModalDialogService,
    private notificationService: NotificationService,
    private router: Router,
    private rxjsUiHelperService: RxjsUiHelperService,
    private userService: AdminOpsUserService
  ) {
    this.datatableActions = [
      {
        type: 'button',
        text: TEXT('Delete'),
        icon: this.icons.delete,
        enabledConstraints: {
          minSelected: 1,
          constraint: [
            {
              operator: 'ne',
              arg0: { prop: 'user_id' },
              arg1: this.authSessionService.getUserId()!
            }
          ]
        },
        callback: (event: Event, action: DatatableAction, table: Datatable) =>
          this.doDelete(table.selected)
      }
    ];
    this.datatableColumns = [
      {
        name: TEXT('User ID'),
        prop: 'user_id',
        css: 'text-break'
      },
      {
        name: TEXT('Full Name'),
        prop: 'display_name',
        hidden: true
      },
      {
        name: TEXT('Email'),
        prop: 'email'
      },
      {
        name: TEXT('Max. Buckets'),
        prop: 'max_buckets',
        cellTemplateName: DatatableCellTemplateName.map,
        cellTemplateConfig: {
          ['-1']: TEXT('Disabled'),
          ['0']: TEXT('Unlimited')
        }
      },
      {
        name: TEXT('Status'),
        prop: 'suspended',
        cellTemplateName: DatatableCellTemplateName.badge,
        cellTemplateConfig: {
          map: {
            /* eslint-disable @typescript-eslint/naming-convention */
            1: { value: TEXT('Suspended'), class: 'badge-outline danger' },
            0: { value: TEXT('Active'), class: 'badge-outline success' }
            /* eslint-enable @typescript-eslint/naming-convention */
          }
        }
      },
      {
        name: TEXT('Size Limit'),
        prop: 'size_limit'
      },
      {
        name: TEXT('Object Limit'),
        prop: 'object_limit'
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
        callback: () => this.router.navigate(['/admin/users/create'])
      }
    ];
  }

  loadData(): void {
    this.pageStatus = !this.firstLoadComplete ? PageStatus.loading : PageStatus.reloading;
    this.userService
      .list(true)
      .pipe(
        finalize(() => {
          this.firstLoadComplete = true;
        })
      )
      .subscribe({
        next: (users: Record<string, any>[]) => {
          _.forEach(users, (record) => {
            const user: User = record as User;
            record['size_limit'] = TEXT('Unlimited');
            record['object_limit'] = TEXT('Unlimited');
            if (user.user_quota!.max_size > 0 && user.user_quota!.enabled) {
              const percentage =
                user.user_quota!.max_size > 0
                  ? (user.stats!.size_actual / user.user_quota!.max_size) * 100
                  : 0;
              record['size_limit'] = `${percentage} %`;
            }
            if (user.user_quota!.max_objects > 0 && user.user_quota!.enabled) {
              const percentage =
                user.user_quota!.max_objects > 0
                  ? (user.stats!.num_objects / user.user_quota!.max_objects) * 100
                  : 0;
              record['object_limit'] = `${percentage} %`;
            }
          });
          this.users = users;
          this.pageStatus = PageStatus.ready;
        },
        error: () => {
          this.users = [];
          this.pageStatus = PageStatus.loadingError;
        }
      });
  }

  private onActionMenu(user: User): DatatableRowAction[] {
    // Build the action menu.
    const result: DatatableRowAction[] = [
      {
        title: TEXT('Edit'),
        icon: this.icons.edit,
        callback: () => {
          this.router.navigate([`/admin/users/edit/${user.user_id}`]);
        }
      },
      {
        title: TEXT('Manage Keys'),
        icon: this.icons.key,
        callback: (data: DatatableData) => {
          this.router.navigate([`/admin/users/${user.user_id}/key`]);
        }
      },
      {
        type: 'divider'
      },
      {
        title: TEXT('Delete'),
        icon: this.icons.delete,
        // Make sure the logged-in user can't be deleted.
        disabled: user.user_id === this.authSessionService.getUserId(),
        callback: (data: DatatableData) => this.doDelete([data])
      }
    ];
    return result;
  }

  private doDelete(selected: DatatableData[]): void {
    this.modalDialogService.confirmDeletion<User>(
      selected as User[],
      'danger',
      {
        singular: TEXT('Do you really want to delete the user <strong>{{ name }}</strong>?'),
        singularFmtArgs: (value: User) => ({ name: value.user_id }),
        plural: TEXT('Do you really want to delete these <strong>{{ count }}</strong> users?')
      },
      () => {
        const sources: Observable<string>[] = [];
        _.forEach(selected, (data: DatatableData) => {
          sources.push(this.userService.delete(data['user_id']));
        });
        this.rxjsUiHelperService
          .concat<string>(
            sources,
            {
              start: TEXT('Please wait, deleting {{ total }} user(s) ...'),
              next: TEXT(
                'Please wait, deleting user {{ current }} of {{ total }} ({{ percent }}%) ...'
              )
            },
            {
              next: TEXT('User {{ name }} has been deleted.'),
              nextFmtArgs: (name: string) => ({ name })
            }
          )
          .subscribe({
            complete: () => this.loadData()
          });
      }
    );
  }
}
