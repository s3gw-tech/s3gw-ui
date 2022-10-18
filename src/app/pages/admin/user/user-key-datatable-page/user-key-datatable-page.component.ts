import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { marker as TEXT } from '@ngneat/transloco-keys-manager/marker';
import * as _ from 'lodash';
import { BlockUI, NgBlockUI } from 'ng-block-ui';
import { finalize } from 'rxjs/operators';

import { format } from '~/app/functions.helper';
import { translate } from '~/app/i18n.helper';
import { DeclarativeFormModalComponent } from '~/app/shared/components/declarative-form-modal/declarative-form-modal.component';
import { ModalComponent } from '~/app/shared/components/modal/modal.component';
import { PageStatus } from '~/app/shared/components/page-status/page-status.component';
import { Icon } from '~/app/shared/enum/icon.enum';
import { DatatableActionItem } from '~/app/shared/models/datatable-action-item.type';
import {
  DatatableCellTemplateName,
  DatatableColumn
} from '~/app/shared/models/datatable-column.type';
import { DatatableData } from '~/app/shared/models/datatable-data.type';
import { AdminOpsUserService, Key, User } from '~/app/shared/services/api/admin-ops-user.service';
import { AuthStorageService } from '~/app/shared/services/auth-storage.service';
import { DialogService } from '~/app/shared/services/dialog.service';

@Component({
  selector: 's3gw-user-key-datatable-page',
  templateUrl: './user-key-datatable-page.component.html',
  styleUrls: ['./user-key-datatable-page.component.scss']
})
export class UserKeyDatatablePageComponent implements OnInit {
  @BlockUI()
  blockUI!: NgBlockUI;

  public icons = Icon;
  public pageStatus: PageStatus = PageStatus.none;
  public keys: Key[] = [];
  public columns: DatatableColumn[];

  private uid = '';
  private firstLoadComplete = false;

  constructor(
    private authStorageService: AuthStorageService,
    private dialogService: DialogService,
    private route: ActivatedRoute,
    private router: Router,
    private userService: AdminOpsUserService
  ) {
    this.columns = [
      {
        name: TEXT('Username'),
        prop: 'user'
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
      if (!_.has(value, 'uid')) {
        this.pageStatus = PageStatus.ready;
        return;
      }
      this.uid = decodeURIComponent(value['uid']);
      this.loadData();
    });
  }

  loadData(): void {
    if (!this.firstLoadComplete) {
      this.pageStatus = PageStatus.loading;
    }
    this.userService
      .get(this.uid)
      .pipe(
        finalize(() => {
          this.firstLoadComplete = true;
        })
      )
      .subscribe({
        next: (user: User) => {
          this.keys = user.keys;
          this.pageStatus = PageStatus.ready;
        },
        error: () => {
          this.keys = [];
          this.pageStatus = PageStatus.loadingError;
        }
      });
  }

  onReload(): void {
    this.pageStatus = PageStatus.reloading;
    this.loadData();
  }

  onAdd(): void {
    this.router.navigate([`/admin/users/${this.uid}/key/create`]);
  }

  onActionMenu(key: Key): DatatableActionItem[] {
    // Make sure the currently used key can't be deleted.
    const credentials = this.authStorageService.getCredentials();
    const deletable = _.some(this.keys, ['secret_key', credentials.secretKey]);
    const result: DatatableActionItem[] = [
      {
        title: TEXT('Show Key'),
        icon: this.icons.edit,
        callback: (data: DatatableData) => {
          this.dialogService.open(DeclarativeFormModalComponent, undefined, {
            formConfig: {
              fields: [
                {
                  type: 'text',
                  name: 'user',
                  label: TEXT('Username'),
                  value: key.user,
                  readonly: true
                },
                {
                  type: 'password',
                  name: 'access_key',
                  label: TEXT('Access Key'),
                  value: key.access_key,
                  readonly: true,
                  hasCopyToClipboardButton: true
                },
                {
                  type: 'password',
                  name: 'secret_key',
                  label: TEXT('Secret Key'),
                  value: key.secret_key,
                  readonly: true,
                  hasCopyToClipboardButton: true
                }
              ]
            },
            submitButtonVisible: false,
            cancelButtonText: TEXT('Close')
          });
        }
      },
      {
        type: 'divider'
      },
      {
        title: TEXT('Delete Key'),
        icon: this.icons.delete,
        disabled: deletable,
        callback: (data: DatatableData) => {
          this.dialogService.open(
            ModalComponent,
            (res: boolean) => {
              if (res) {
                this.blockUI.start(translate(TEXT('Please wait, deleting key ...')));
                this.userService
                  .deleteKey(this.uid, key.access_key!)
                  .pipe(finalize(() => this.blockUI.stop()))
                  .subscribe(() => {
                    this.loadData();
                  });
              }
            },
            {
              type: 'yesNo',
              icon: 'danger',
              message: format(
                TEXT(`Do you really want to delete the key <strong>{{ key }}</strong>?`),
                {
                  key: key.user
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
