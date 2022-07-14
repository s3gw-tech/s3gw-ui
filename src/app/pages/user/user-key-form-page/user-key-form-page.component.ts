import { Component, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { marker as TEXT } from '@ngneat/transloco-keys-manager/marker';
import * as _ from 'lodash';
import { finalize } from 'rxjs/operators';

import { DeclarativeFormComponent } from '~/app/shared/components/declarative-form/declarative-form.component';
import { PageStatus } from '~/app/shared/components/page-status/page-status.component';
import {
  DeclarativeFormConfig,
  FormButtonConfig
} from '~/app/shared/models/declarative-form-config.type';
import { User, UserKey, UserService } from '~/app/shared/services/api/user.service';

@Component({
  selector: 's3gw-user-key-form-page',
  templateUrl: './user-key-form-page.component.html',
  styleUrls: ['./user-key-form-page.component.scss']
})
export class UserKeyFormPageComponent implements OnInit {
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
    private userService: UserService
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe((value: Params) => {
      this.pageStatus = PageStatus.ready;
      this.uid = decodeURIComponent(value['uid']);
      this.user = decodeURIComponent(value['user']);
      const creating = this.router.url.endsWith(`/key/create`);
      this.createForm(creating);
      if (!creating) {
        this.loadData();
      }
    });
  }

  loadData(): void {
    this.pageStatus = PageStatus.loading;
    this.userService.get(this.uid).subscribe({
      next: (user: User) => {
        const key: UserKey | undefined = _.find(user.keys, ['user', this.user]);
        if (!_.isUndefined(key)) {
          this.pageStatus = PageStatus.ready;
          this.form.patchValues(key);
        } else {
          this.pageStatus = PageStatus.loadingError;
        }
      },
      error: () => (this.pageStatus = PageStatus.loadingError)
    });
  }

  private createForm(creating: boolean) {
    const buttons: FormButtonConfig[] = [
      {
        type: 'default',
        text: TEXT('Cancel'),
        click: () => this.router.navigate([`/user/${this.uid}/key`])
      }
    ];
    if (creating) {
      buttons.push({
        type: 'submit',
        text: TEXT('Create'),
        click: () => {
          const key: UserKey = this.form.values as UserKey;
          this.userService.createKey(this.uid, key).subscribe({
            next: () => {
              this.router.navigate([`/user/${this.uid}/key`]);
            },
            error: () => {
              this.pageStatus = PageStatus.savingError;
            }
          });
        }
      });
    }
    this.config = {
      buttons,
      fields: [
        {
          type: 'text',
          name: 'user',
          label: TEXT('Username'),
          value: this.uid,
          readonly: true,
          validators: {
            required: true
          }
        },
        {
          type: 'password',
          name: 'access_key',
          label: TEXT('Access Key'),
          value: '',
          readonly: !creating,
          hasCopyToClipboardButton: true,
          validators: {
            required: true
          }
        },
        {
          type: 'password',
          name: 'secret_key',
          label: TEXT('Secret Key'),
          value: '',
          readonly: !creating,
          hasCopyToClipboardButton: true,
          validators: {
            required: true
          }
        }
      ]
    };
  }
}
