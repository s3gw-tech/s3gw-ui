import { Component, OnInit } from '@angular/core';
import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { ActivatedRoute, Params } from '@angular/router';
import { marker as TEXT } from '@ngneat/transloco-keys-manager/marker';
import * as _ from 'lodash';
import { finalize } from 'rxjs/operators';

import { format } from '~/app/functions.helper';
import { DeclarativeFormModalComponent } from '~/app/shared/components/declarative-form-modal/declarative-form-modal.component';
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
import { DeclarativeFormValues } from '~/app/shared/models/declarative-form-config.type';
import { DeclarativeFormModalConfig } from '~/app/shared/models/declarative-form-modal-config.type';
import { PageAction } from '~/app/shared/models/page-action.type';
import {
  S3BucketName,
  S3BucketService,
  S3GetBucketLifecycleConfiguration,
  S3ID,
  S3LifecycleRule,
  S3LifecycleRules
} from '~/app/shared/services/api/s3-bucket.service';
import { DialogService } from '~/app/shared/services/dialog.service';
import { ModalDialogService } from '~/app/shared/services/modal-dialog.service';
import { NotificationService } from '~/app/shared/services/notification.service';

@Component({
  selector: 's3gw-bucket-lifecycle-datatable-page',
  templateUrl: './bucket-lifecycle-datatable-page.component.html',
  styleUrls: ['./bucket-lifecycle-datatable-page.component.scss']
})
export class BucketLifecycleDatatablePageComponent implements OnInit {
  public bid: S3BucketName = '';
  public rules: S3LifecycleRules = [];
  public datatableActions: DatatableAction[] = [];
  public datatableColumns: DatatableColumn[] = [];
  public icons = Icon;
  public pageActions: PageAction[] = [];
  public pageStatus: PageStatus = PageStatus.none;

  private firstLoadComplete = false;

  constructor(
    private dialogService: DialogService,
    private modalDialogService: ModalDialogService,
    private notificationService: NotificationService,
    private route: ActivatedRoute,
    private s3BucketService: S3BucketService
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
          this.doDelete(table.selected as S3LifecycleRules)
      }
    ];
    this.datatableColumns = [
      {
        name: TEXT('ID'),
        prop: 'ID'
      },
      {
        name: TEXT('Status'),
        prop: 'Status',
        cellTemplateName: DatatableCellTemplateName.badge,
        cellTemplateConfig: {
          map: {
            /* eslint-disable @typescript-eslint/naming-convention */
            Disabled: { value: TEXT('Disabled'), class: 'badge-outline dark' },
            Enabled: { value: TEXT('Enabled'), class: 'badge-outline success' }
            /* eslint-enable @typescript-eslint/naming-convention */
          }
        }
      },
      {
        name: TEXT('Prefix'),
        prop: 'Filter.Prefix'
      },
      {
        name: TEXT('Expires after'),
        prop: 'Expiration.Days'
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
        callback: this.doAdd.bind(this)
      }
    ];
  }

  ngOnInit(): void {
    this.route.params.subscribe((value: Params) => {
      if (!_.has(value, 'bid')) {
        this.pageStatus = PageStatus.ready;
        return;
      }
      this.bid = decodeURIComponent(value['bid']);
      this.loadData();
    });
  }

  loadData(): void {
    this.pageStatus = !this.firstLoadComplete ? PageStatus.loading : PageStatus.reloading;
    this.s3BucketService
      .getLifecycleConfiguration(this.bid)
      .pipe(
        finalize(() => {
          this.firstLoadComplete = true;
        })
      )
      .subscribe({
        next: (config: S3GetBucketLifecycleConfiguration) => {
          // Pick only the required properties of a life cycle rule.
          this.rules = config.Rules
            ? _.map(config.Rules, (rule: S3LifecycleRule) =>
                _.pick(rule, ['ID', 'Status', 'Expiration', 'Prefix', 'Filter'])
              )
            : [];
          this.pageStatus = PageStatus.ready;
        },
        error: () => {
          this.rules = [];
          this.pageStatus = PageStatus.loadingError;
        }
      });
  }

  private onActionMenu(rule: S3LifecycleRule): DatatableRowAction[] {
    const result: DatatableRowAction[] = [
      {
        title: TEXT('Edit'),
        icon: this.icons.edit,
        callback: (data: DatatableData) => {
          this.doEdit(data as S3LifecycleRule);
        }
      },
      {
        type: 'divider'
      },
      {
        title: TEXT('Delete'),
        icon: this.icons.delete,
        callback: (data: DatatableData) => this.doDelete([data as S3LifecycleRule])
      }
    ];
    return result;
  }

  private doAdd(): void {
    this.dialogService.open(
      DeclarativeFormModalComponent,
      (values: DeclarativeFormValues | false) => {
        if (false === values) {
          return;
        }
        const newRule: S3LifecycleRule = {
          /* eslint-disable @typescript-eslint/naming-convention */
          ID: values['id'],
          Status: values['enabled'] ? 'Enabled' : 'Disabled',
          Expiration: {
            Days: values['days']
          },
          Filter: {
            Prefix: values['prefix']
          }
          /* eslint-enable @typescript-eslint/naming-convention */
        };
        const newRules: S3LifecycleRules = [newRule, ...this.rules];
        this.s3BucketService
          .setLifecycleConfiguration(this.bid, newRules)
          .pipe()
          .subscribe(() => {
            this.loadData();
          });
      },
      this.createForm('create')
    );
  }

  private doEdit(rule: S3LifecycleRule): void {
    this.dialogService.open(
      DeclarativeFormModalComponent,
      (values: DeclarativeFormValues | false) => {
        if (false === values) {
          return;
        }
        const ruleToModify: S3LifecycleRule | undefined = _.find(this.rules, ['ID', rule.ID]);
        if (_.isUndefined(ruleToModify)) {
          return;
        }
        /* eslint-disable @typescript-eslint/naming-convention */
        ruleToModify.Prefix = '';
        ruleToModify.Status = values['enabled'] ? 'Enabled' : 'Disabled';
        ruleToModify.Expiration = { Days: values['days'] };
        ruleToModify.Filter = { Prefix: values['prefix'] };
        /* eslint-enable @typescript-eslint/naming-convention */
        this.s3BucketService
          .setLifecycleConfiguration(this.bid, this.rules)
          .pipe()
          .subscribe(() => {
            this.loadData();
          });
      },
      this.createForm('edit', rule)
    );
  }

  private doDelete(rules: S3LifecycleRules): void {
    const removeIDs: S3ID[] = _.map(rules, _.property('ID'));
    this.modalDialogService.confirmDeletion<S3ID>(
      removeIDs,
      {
        singular: TEXT(
          'Do you really want to delete the lifecycle rule <strong>{{ name }}</strong>?'
        ),
        singularFmtArgs: (id: S3ID) => ({ name: id }),
        plural: TEXT(
          'Do you really want to delete these <strong>{{ count }}</strong> lifecycle rules?'
        )
      },
      () => {
        const newRules = _.cloneDeep(this.rules);
        _.remove(newRules, (rule: S3LifecycleRule) => removeIDs.includes(rule.ID!));
        this.s3BucketService
          .setLifecycleConfiguration(this.bid, newRules)
          .pipe()
          .subscribe(() => {
            this.notificationService.showSuccess(
              removeIDs.length > 1
                ? format(TEXT('The lifecycle rules {{ ids }} have been deleted in {{ bid }}.'), {
                    ids: removeIDs.join(', '),
                    bid: this.bid
                  })
                : format(TEXT('The lifecycle rule {{ id }} has been deleted in {{ bid }}.'), {
                    id: removeIDs[0],
                    bid: this.bid
                  })
            );
            this.loadData();
          });
      }
    );
  }

  private createForm(mode: 'create' | 'edit', rule?: S3LifecycleRule): DeclarativeFormModalConfig {
    return {
      formConfig: {
        title: mode === 'create' ? TEXT('Lifecycle Rule: Create') : TEXT('Lifecycle Rule'),
        fields: [
          {
            type: 'text',
            name: 'id',
            label: TEXT('ID'),
            hint: TEXT('Unique identifier for the rule.'),
            value: _.get(rule, 'ID', ''),
            readonly: mode === 'edit',
            validators: {
              required: true,
              maxLength: 255,
              custom: this.uniqueID()
            }
          },
          {
            type: 'checkbox',
            name: 'enabled',
            label: TEXT('Enabled'),
            value: _.get(rule, 'Status', 'Disabled') === 'Enabled'
          },
          {
            type: 'text',
            name: 'prefix',
            label: TEXT('Prefix'),
            value: _.get(rule, 'Filter.Prefix', _.get(rule, 'Prefix', '')),
            hint: TEXT(
              'If you do not specify a prefix, then the rule is applied to all objects in the bucket. If you specify a prefix as data/, then the rule is applied to all objects under the prefix data/.'
            )
          },
          {
            type: 'number',
            name: 'days',
            label: TEXT('Expires after'),
            value: _.get(rule, 'Expiration.Days', 365),
            hint: TEXT('Expires after the specified days since object creation.'),
            validators: {
              min: 1,
              patternType: 'numeric',
              required: true
            }
          }
        ]
      }
    } as DeclarativeFormModalConfig;
  }

  private uniqueID(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (_.isEmpty(control.value)) {
        return null;
      }
      const valid = _.findIndex(this.rules, ['ID', control.value]) === -1;
      return !valid ? { custom: 'The ID already exists.' } : null;
    };
  }
}
