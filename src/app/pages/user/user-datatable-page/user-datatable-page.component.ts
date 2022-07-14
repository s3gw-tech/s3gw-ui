import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { marker as TEXT } from '@ngneat/transloco-keys-manager/marker';
import { BlockUI, NgBlockUI } from 'ng-block-ui';
import { finalize } from 'rxjs/operators';

import { translate } from '~/app/i18n.helper';
import { DialogComponent } from '~/app/shared/components/dialog/dialog.component';
import { PageStatus } from '~/app/shared/components/page-status/page-status.component';
import { Icon } from '~/app/shared/enum/icon.enum';
import { DatatableActionItem } from '~/app/shared/models/datatable-action-item.type';
import {
  DatatableCellTemplateName,
  DatatableColumn
} from '~/app/shared/models/datatable-column.type';
import { DatatableData } from '~/app/shared/models/datatable-data.type';
import { User, UsersService } from '~/app/shared/services/api/users.service';
import { DialogService } from '~/app/shared/services/dialog.service';

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
    private dialogService: DialogService,
    private router: Router,
    private usersService: UsersService
  ) {
    this.columns = [
      {
        name: TEXT('Username'),
        prop: 'uid'
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
        name: TEXT('Object Limit'),
        prop: 'object_usage'
      },
      {
        name: TEXT('Capacity Limit'),
        prop: 'size_usage'
      },
      {
        name: TEXT('Status'),
        prop: 'suspended',
        cellTemplateName: DatatableCellTemplateName.badge,
        cellTemplateConfig: {
          map: {
            true: { value: TEXT('Suspended'), class: 's3gw-color-theme-danger' },
            false: { value: TEXT('Active'), class: 's3gw-color-theme-success' }
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
    this.usersService
      .list()
      .pipe(
        finalize(() => {
          this.firstLoadComplete = true;
        })
      )
      .subscribe(
        (users: User[]) => {
          this.users = users;
          this.pageStatus = PageStatus.ready;
        },
        () => (this.pageStatus = PageStatus.loadingError)
      );
  }

  onAdd(): void {
    this.router.navigate(['/users/create/']);
  }

  onActionMenu(user: User): DatatableActionItem[] {
    const result: DatatableActionItem[] = [
      {
        title: TEXT('Edit User'),
        icon: this.icons.edit,
        callback: (data: DatatableData) => {
          this.router.navigate([`/users/edit/${user.uid}`]);
        }
      },
      {
        title: TEXT('User Details'),
        icon: this.icons.details,
        callback: (data: DatatableData) => {
          this.router.navigate([`/users/details/${user.uid}`]);
        }
      },
      {
        title: TEXT('Show S3 Key'),
        icon: this.icons.key,
        callback: (data: DatatableData) => {}
      },
      {
        type: 'divider'
      },
      {
        title: TEXT('Delete User'),
        icon: this.icons.delete,
        callback: (data: DatatableData) => {
          this.dialogService.open(
            DialogComponent,
            (res: boolean) => {
              if (res) {
                this.blockUI.start(translate(TEXT('Please wait, deleting user ...')));
                this.usersService
                  .delete(user.uid)
                  .pipe(finalize(() => this.blockUI.stop()))
                  .subscribe(() => {
                    this.loadData();
                  });
              }
            },
            {
              type: 'yesNo',
              icon: 'question',
              message: TEXT(`Do you really want to delete user <strong>${user.uid}</strong>?`)
            }
          );
        }
      }
    ];
    return result;
  }
}
