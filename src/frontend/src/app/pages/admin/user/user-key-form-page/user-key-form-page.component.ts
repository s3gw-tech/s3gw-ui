import { Component, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { marker as TEXT } from '@ngneat/transloco-keys-manager/marker';

import { DeclarativeFormComponent } from '~/app/shared/components/declarative-form/declarative-form.component';
import { PageStatus } from '~/app/shared/components/page-wrapper/page-wrapper.component';
import { DeclarativeFormConfig } from '~/app/shared/models/declarative-form-config.type';
import { IsDirty } from '~/app/shared/models/is-dirty.interface';
import { AdminOpsUserService, Key } from '~/app/shared/services/api/admin-ops-user.service';

@Component({
  selector: 's3gw-user-key-form-page',
  templateUrl: './user-key-form-page.component.html',
  styleUrls: ['./user-key-form-page.component.scss']
})
export class UserKeyFormPageComponent implements OnInit, IsDirty {
  @ViewChild(DeclarativeFormComponent, { static: false })
  form!: DeclarativeFormComponent;

  public pageStatus: PageStatus = PageStatus.none;
  public config: DeclarativeFormConfig = {
    fields: []
  };

  private uid = '';
  private user = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private userService: AdminOpsUserService
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe((value: Params) => {
      this.pageStatus = PageStatus.ready;
      this.uid = decodeURIComponent(value['uid']);
      this.user = decodeURIComponent(value['user']);
      this.createForm();
    });
  }

  isDirty(): boolean {
    return !this.form.pristine;
  }

  private createForm() {
    this.config = {
      buttons: [
        {
          type: 'default',
          text: TEXT('Cancel'),
          click: () => this.router.navigate([`/admin/users/${this.uid}/key`])
        },
        {
          type: 'submit',
          text: TEXT('Create'),
          click: () => {
            const key: Key = this.form.values as Key;
            this.pageStatus = PageStatus.saving;
            this.userService.createKey(this.uid, key).subscribe({
              next: () => {
                this.form.markAsPristine();
                this.router.navigate([`/admin/users/${this.uid}/key`]);
              },
              error: () => {
                this.pageStatus = PageStatus.savingError;
              }
            });
          }
        }
      ],
      fields: [
        {
          type: 'text',
          name: 'uid',
          label: TEXT('Username'),
          value: this.uid,
          readonly: true,
          submitValue: false,
          validators: {
            required: true
          }
        },
        {
          type: 'checkbox',
          name: 'generate_key',
          value: true,
          label: TEXT('Auto-generate Keys')
        },
        {
          type: 'password',
          name: 'access_key',
          label: TEXT('Access Key'),
          value: '',
          hasCopyToClipboardButton: true,
          validators: {
            requiredIf: {
              operator: 'falsy',
              arg0: { prop: 'generate_key' }
            },
            // https://docs.aws.amazon.com/IAM/latest/APIReference/API_AccessKey.html
            pattern: /^\w+$/,
            patternErrorMessage: TEXT(
              'The access key is invalid. Valid characters are a-z, A-Z, 0-9 and _'
            ),
            minLength: 16,
            maxLength: 128
          },
          modifiers: [
            {
              type: 'readonly',
              constraint: {
                operator: 'truthy',
                arg0: { prop: 'generate_key' }
              }
            }
          ]
        },
        {
          type: 'password',
          name: 'secret_key',
          label: TEXT('Secret Key'),
          value: '',
          hasCopyToClipboardButton: true,
          validators: {
            requiredIf: {
              operator: 'falsy',
              arg0: { prop: 'generate_key' }
            }
          },
          modifiers: [
            {
              type: 'readonly',
              constraint: {
                operator: 'truthy',
                arg0: { prop: 'generate_key' }
              }
            }
          ]
        }
      ]
    };
  }
}
