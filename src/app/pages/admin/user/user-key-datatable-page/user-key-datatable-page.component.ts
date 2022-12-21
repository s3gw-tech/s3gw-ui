import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { marker as TEXT } from '@ngneat/transloco-keys-manager/marker';
import * as _ from 'lodash';
import { BlockUI, NgBlockUI } from 'ng-block-ui';
import { finalize } from 'rxjs/operators';

import { translate } from '~/app/i18n.helper';
import { DeclarativeFormModalComponent } from '~/app/shared/components/declarative-form-modal/declarative-form-modal.component';
import { PageStatus } from '~/app/shared/components/page-wrapper/page-wrapper.component';
import { Icon } from '~/app/shared/enum/icon.enum';
import { DatatableAction } from '~/app/shared/models/datatable-action.type';
import {
  DatatableCellTemplateName,
  DatatableColumn
} from '~/app/shared/models/datatable-column.type';
import { DatatableData } from '~/app/shared/models/datatable-data.type';
import { DatatableRowAction } from '~/app/shared/models/datatable-row-action.type';
import { DeclarativeFormModalConfig } from '~/app/shared/models/declarative-form-modal-config.type';
import { PageAction } from '~/app/shared/models/page-action.type';
import { AdminOpsUserService, Key, User } from '~/app/shared/services/api/admin-ops-user.service';
import { AuthSessionService } from '~/app/shared/services/auth-session.service';
import { DialogService } from '~/app/shared/services/dialog.service';
import { ModalDialogService } from '~/app/shared/services/modal-dialog.service';

@Component({
  selector: 's3gw-user-key-datatable-page',
  templateUrl: './user-key-datatable-page.component.html',
  styleUrls: ['./user-key-datatable-page.component.scss']
})
export class UserKeyDatatablePageComponent implements OnInit {
  @BlockUI()
  blockUI!: NgBlockUI;

  public datatableActions: DatatableAction[];
  public datatableColumns: DatatableColumn[];
  public icons = Icon;
  public keys: Key[] = [];
  public pageActions: PageAction[];
  public pageStatus: PageStatus = PageStatus.none;

  private uid = '';
  private firstLoadComplete = false;

  constructor(
    private authSessionService: AuthSessionService,
    private dialogService: DialogService,
    private modalDialogService: ModalDialogService,
    private route: ActivatedRoute,
    private router: Router,
    private userService: AdminOpsUserService
  ) {
    this.datatableActions = [
      {
        type: 'button',
        text: TEXT('Delete'),
        icon: this.icons.delete,
        enabledConstraints: {
          minSelected: 1
        }
      }
    ];
    this.datatableColumns = [
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
    this.pageActions = [
      {
        type: 'button',
        text: TEXT('Create'),
        icon: this.icons.create,
        callback: () => this.router.navigate([`/admin/users/${this.uid}/key/create`])
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
    this.pageStatus = !this.firstLoadComplete ? PageStatus.loading : PageStatus.reloading;
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

  onActionMenu(key: Key): DatatableRowAction[] {
    // Make sure the currently used key can't be deleted.
    const credentials = this.authSessionService.getCredentials();
    const deletable = _.some(this.keys, ['secret_key', credentials.secretKey]);
    const result: DatatableRowAction[] = [
      {
        title: TEXT('Show'),
        icon: this.icons.show,
        callback: () => {
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
          } as DeclarativeFormModalConfig);
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
          this.modalDialogService.confirmation<Key>(
            [key],
            'danger',
            {
              singular: TEXT('Do you really want to delete the key <strong>{{ name }}</strong>?'),
              singularFmtArgs: (value: Key) => ({ name: value.user })
            },
            () => {
              this.blockUI.start(translate(TEXT('Please wait, deleting key ...')));
              this.userService
                .deleteKey(this.uid, key.access_key!)
                .pipe(finalize(() => this.blockUI.stop()))
                .subscribe(() => {
                  this.loadData();
                });
            }
          );
        }
      }
    ];
    return result;
  }
}
