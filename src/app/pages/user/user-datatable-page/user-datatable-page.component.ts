import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { marker as TEXT } from '@ngneat/transloco-keys-manager/marker';
import * as _ from 'lodash';
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
import { User, UserService } from '~/app/shared/services/api/user.service';
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
  public users: User[] = [];
  public columns: DatatableColumn[];

  private firstLoadComplete = false;

  constructor(
    private authStorageService: AuthStorageService,
    private dialogService: DialogService,
    private notificationService: NotificationService,
    private router: Router,
    private userService: UserService
  ) {
    this.columns = [
      {
        name: TEXT('Username'),
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
        prop: 'max_buckets'
      },
      {
        name: TEXT('Status'),
        prop: 'suspended',
        cellTemplateName: DatatableCellTemplateName.badge,
        cellTemplateConfig: {
          map: {
            /* eslint-disable @typescript-eslint/naming-convention */
            1: { value: TEXT('Suspended'), class: 's3gw-color-theme-danger' },
            0: { value: TEXT('Active'), class: 's3gw-color-theme-success' }
          }
        }
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
      .list()
      .pipe(
        finalize(() => {
          this.firstLoadComplete = true;
        })
      )
      .subscribe({
        next: (users: User[]) => {
          this.users = users;
          this.pageStatus = PageStatus.ready;
        },
        error: () => {
          this.users = [];
          this.pageStatus = PageStatus.loadingError;
        }
      });
  }

  onCreate(): void {
    this.router.navigate(['/user/create/']);
  }

  onActionMenu(user: User): DatatableActionItem[] {
    // Make sure the logged-in user can't be deleted.
    const credentials = this.authStorageService.getCredentials();
    const userDeletable = _.some(user.keys, ['access_key', credentials.accessKey]);
    // Build the action menu.
    const result: DatatableActionItem[] = [
      {
        title: TEXT('Edit User'),
        icon: this.icons.edit,
        callback: (data: DatatableData) => {
          this.router.navigate([`/user/edit/${user.user_id}`]);
        }
      },
      {
        title: TEXT('Manage Keys'),
        icon: this.icons.key,
        callback: (data: DatatableData) => {
          this.router.navigate([`/user/${user.user_id}/key`]);
        }
      },
      {
        type: 'divider'
      },
      {
        title: TEXT('Delete User'),
        icon: this.icons.delete,
        disabled: userDeletable,
        callback: (data: DatatableData) => {
          this.dialogService.open(
            ModelComponent,
            (res: boolean) => {
              if (res) {
                this.blockUI.start(translate(TEXT('Please wait, deleting user ...')));
                this.userService
                  .delete(user.user_id)
                  .pipe(finalize(() => this.blockUI.stop()))
                  .subscribe(() => {
                    this.notificationService.showSuccess(TEXT(`Deleted user ${user.user_id}.`));
                    this.loadData();
                  });
              }
            },
            {
              type: 'yesNo',
              icon: 'danger',
              message: TEXT(`Do you really want to delete user <strong>${user.user_id}</strong>?`)
            }
          );
        }
      }
    ];
    return result;
  }
}
