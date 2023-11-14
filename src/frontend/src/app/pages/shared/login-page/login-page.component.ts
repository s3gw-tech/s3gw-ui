import { Component, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { marker as TEXT } from '@ngneat/transloco-keys-manager/marker';
import * as _ from 'lodash';
import { finalize } from 'rxjs/operators';

import { translate } from '~/app/i18n.helper';
import { DeclarativeFormComponent } from '~/app/shared/components/declarative-form/declarative-form.component';
import { DeclarativeFormConfig } from '~/app/shared/models/declarative-form-config.type';
import { AuthResponse, AuthService } from '~/app/shared/services/api/auth.service';
import { AppConfigService } from '~/app/shared/services/app-config.service';
import { AppMainConfigService } from '~/app/shared/services/app-main-config.service';
import { BlockUiService } from '~/app/shared/services/block-ui.service';
import { DialogService } from '~/app/shared/services/dialog.service';

@Component({
  selector: 's3gw-login-page',
  templateUrl: './login-page.component.html',
  styleUrls: ['./login-page.component.scss']
})
export class LoginPageComponent implements OnInit {
  @ViewChild(DeclarativeFormComponent, { static: true })
  form!: DeclarativeFormComponent;

  public config: DeclarativeFormConfig = {
    buttonAlign: 'center',
    buttons: [
      {
        type: 'submit',
        text: TEXT('Log in'),
        click: this.onLogin.bind(this)
      }
    ],
    fields: [
      {
        name: 'accessKey',
        type: 'text',
        label: TEXT('Access key'),
        value: '',
        validators: {
          required: true
        }
      },
      {
        name: 'secretKey',
        type: 'password',
        label: TEXT('Secret key'),
        value: '',
        validators: {
          required: true
        }
      }
    ]
  };
  public errorMessage?: string;
  public welcomeMessage: string;

  constructor(
    private appConfigService: AppConfigService,
    private appMainConfigService: AppMainConfigService,
    private authService: AuthService,
    private blockUiService: BlockUiService,
    private dialogService: DialogService,
    private router: Router
  ) {
    this.welcomeMessage = translate(TEXT('Welcome to {{ title }}'), this.appConfigService.config);
  }

  ngOnInit(): void {
    this.blockUiService.resetGlobal();
    // Ensure all open modal dialogs are closed.
    this.dialogService.dismissAll();
    // Add the additional `Instance` field to the form if the
    // `instanceId` is available.
    if (this.appMainConfigService.config.InstanceId) {
      this.config.fields.unshift({
        name: 'instanceId',
        type: 'text',
        label: TEXT('Instance'),
        value: this.appMainConfigService.config.InstanceId,
        readonly: true,
        submitValue: false
      });
    }
  }

  onLogin(): void {
    this.errorMessage = undefined;
    this.blockUiService.start(translate(TEXT('Please wait ...')));
    const values = this.form.values;
    this.authService
      .login(values['accessKey'], values['secretKey'])
      .pipe(
        finalize(() => {
          this.blockUiService.stop();
        })
      )
      .subscribe({
        next: (resp: AuthResponse) => {
          this.router.navigate(['/dashboard']);
        },
        error: (err) => {
          err.preventAll?.();
          if (err.status === 403 || err.statusCode === 403) {
            this.errorMessage = TEXT('Invalid access or secret key. Please try again.');
          } else {
            this.errorMessage = _.get(err, 'error.detail', err.message);
          }
        }
      });
  }
}
