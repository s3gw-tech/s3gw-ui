import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { marker as TEXT } from '@ngneat/transloco-keys-manager/marker';
import * as _ from 'lodash';
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
import { AdminOpsUserService, User } from '~/app/shared/services/api/admin-ops-user.service';
import { AuthStorageService } from '~/app/shared/services/auth-storage.service';
import { DialogService } from '~/app/shared/services/dialog.service';
import { NotificationService } from '~/app/shared/services/notification.service';

@Component({
  selector: 's3gw-user-datatable-page',
  templateUrl: './user-datatable-page.component.html',
  styleUrls: ['./user-datatable-page.component.scss']
})
export class UserDatatablePageComponent {
  @BlockUI()
  blockUI!: NgBlockUI;

  public icons = Icon;
  public pageStatus: PageStatus = PageStatus.none;
  public users: Record<string, any>[] = [];
  public columns: DatatableColumn[];

  private firstLoadComplete = false;

  constructor(
    private authStorageService: AuthStorageService,
    private dialogService: DialogService,
    private notificationService: NotificationService,
    private router: Router,
    private userService: AdminOpsUserService
  ) {
    this.columns = [
      {
        name: TEXT('User ID'),
        prop: 'user_id'
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
  }

  loadData(): void {
    if (!this.firstLoadComplete) {
      this.pageStatus = PageStatus.loading;
    }
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

  onReload(): void {
    this.pageStatus = PageStatus.reloading;
    this.loadData();
  }

  onCreate(): void {
    this.router.navigate(['/admin/users/create/']);
  }

  onActionMenu(user: User): DatatableActionItem[] {
    // Make sure the logged-in user can't be deleted.
    const credentials = this.authStorageService.getCredentials();
    const deletable = _.some(user.keys, ['access_key', credentials.accessKey]);
    // Build the action menu.
    const result: DatatableActionItem[] = [
      {
        title: TEXT('Edit'),
        icon: this.icons.edit,
        callback: (data: DatatableData) => {
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
        disabled: deletable,
        callback: (data: DatatableData) => {
          this.dialogService.open(
            ModalComponent,
            (res: boolean) => {
              if (res) {
                this.blockUI.start(translate(TEXT('Please wait, deleting user ...')));
                this.userService
                  .delete(user.user_id)
                  .pipe(finalize(() => this.blockUI.stop()))
                  .subscribe(() => {
                    this.notificationService.showSuccess(TEXT(`Deleted user ${user.user_id}.`));
                    this.onReload();
                  });
              }
            },
            {
              type: 'yesNo',
              icon: 'danger',
              message: TEXT(
                `Do you really want to delete the user <strong>${user.user_id}</strong>?`
              )
            }
          );
        }
      }
    ];
    return result;
  }
}
