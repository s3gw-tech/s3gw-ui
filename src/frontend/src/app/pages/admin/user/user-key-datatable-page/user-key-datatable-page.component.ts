import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { marker as TEXT } from '@ngneat/transloco-keys-manager/marker';
import * as _ from 'lodash';
import { Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';

import { PageStatus } from '~/app/shared/components/page-wrapper/page-wrapper.component';
import { Icon } from '~/app/shared/enum/icon.enum';
import { Credentials } from '~/app/shared/models/credentials.type';
import { Datatable } from '~/app/shared/models/datatable.interface';
import { DatatableAction } from '~/app/shared/models/datatable-action.type';
import {
  DatatableCellTemplateName,
  DatatableColumn
} from '~/app/shared/models/datatable-column.type';
import { DatatableData } from '~/app/shared/models/datatable-data.type';
import { DatatableRowAction } from '~/app/shared/models/datatable-row-action.type';
import { PageAction } from '~/app/shared/models/page-action.type';
import { AdminOpsUserService, Key, User } from '~/app/shared/services/api/admin-ops-user.service';
import { AuthSessionService } from '~/app/shared/services/auth-session.service';
import { DialogService } from '~/app/shared/services/dialog.service';
import { ModalDialogService } from '~/app/shared/services/modal-dialog.service';
import { RxjsUiHelperService } from '~/app/shared/services/rxjs-ui-helper.service';

@Component({
  selector: 's3gw-user-key-datatable-page',
  templateUrl: './user-key-datatable-page.component.html',
  styleUrls: ['./user-key-datatable-page.component.scss']
})
export class UserKeyDatatablePageComponent implements OnInit {
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
    private rxjsUiHelperService: RxjsUiHelperService,
    private userService: AdminOpsUserService
  ) {
    const credentials = this.authSessionService.getCredentials();
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
              arg0: { prop: 'access_key' },
              arg1: credentials.accessKey!
            },
            {
              operator: 'ne',
              arg0: { prop: 'secret_key' },
              arg1: credentials.secretKey!
            }
          ]
        },
        callback: (event: Event, action: DatatableAction, table: Datatable) =>
          this.doDelete(table.selected)
      }
    ];
    this.datatableColumns = [
      {
        name: TEXT('Username'),
        prop: 'user'
      },
      {
        name: TEXT('Access Key'),
        prop: 'access_key',
        cellTemplateName: DatatableCellTemplateName.masked
      },
      {
        name: TEXT('Secret Key'),
        prop: 'secret_key',
        cellTemplateName: DatatableCellTemplateName.masked
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
    const deletable = Credentials.isEqual(credentials, Credentials.fromKey(key));
    const result: DatatableRowAction[] = [
      {
        title: TEXT('Delete'),
        icon: this.icons.delete,
        disabled: deletable,
        callback: (data: DatatableData) => this.doDelete([data])
      }
    ];
    return result;
  }

  private doDelete(selected: DatatableData[]): void {
    this.modalDialogService.confirmDeletion<Key>(
      selected as Key[],
      {
        singular: TEXT('Do you really want to delete the key <strong>{{ name }}</strong>?'),
        singularFmtArgs: (key: Key) => ({ name: key.access_key }),
        plural: TEXT('Do you really want to delete these <strong>{{ count }}</strong> keys?')
      },
      () => {
        const sources: Observable<Key>[] = [];
        _.forEach(selected, (data: DatatableData) => {
          sources.push(this.userService.deleteKey(this.uid, data['access_key']));
        });
        this.rxjsUiHelperService
          .concat<Key>(
            sources,
            {
              start: TEXT('Please wait, deleting {{ total }} key(s) ...'),
              next: TEXT(
                'Please wait, deleting key {{ current }} of {{ total }} ({{ percent }}%) ...'
              )
            },
            {
              next: TEXT('The key {{ accessKey }} from {{ user }} has been deleted.'),
              nextFmtArgs: (key: Key) => ({ accessKey: key.access_key, user: key.user })
            }
          )
          .subscribe({
            complete: () => this.loadData()
          });
      }
    );
  }
}
