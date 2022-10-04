import { Component, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { marker as TEXT } from '@ngneat/transloco-keys-manager/marker';
import * as _ from 'lodash';
import { BlockUI, NgBlockUI } from 'ng-block-ui';
import { finalize } from 'rxjs/operators';

import { translate } from '~/app/i18n.helper';
import { DeclarativeFormComponent } from '~/app/shared/components/declarative-form/declarative-form.component';
import { DeclarativeFormConfig } from '~/app/shared/models/declarative-form-config.type';
import { AuthService } from '~/app/shared/services/api/auth.service';
import { DialogService } from '~/app/shared/services/dialog.service';
import { NotificationService, NotificationType } from '~/app/shared/services/notification.service';

@Component({
  selector: 's3gw-login-page',
  templateUrl: './login-page.component.html',
  styleUrls: ['./login-page.component.scss']
})
export class LoginPageComponent implements OnInit {
  @BlockUI()
  blockUI!: NgBlockUI;

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

  constructor(
    private authService: AuthService,
    private dialogService: DialogService,
    private notificationService: NotificationService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.blockUI.resetGlobal();
    // Ensure all open modal dialogs are closed.
    this.dialogService.dismissAll();
  }

  onLogin(): void {
    this.errorMessage = undefined;
    this.blockUI.start(translate(TEXT('Please wait ...')));
    const values = this.form.values;
    this.authService
      .login(values['accessKey'], values['secretKey'])
      .pipe(finalize(() => this.blockUI.stop()))
      .subscribe({
        next: () => {
          this.router.navigate(['/dashboard']);
        },
        error: (err) => {
          err.preventAll();
          if (err.status === 403) {
            this.errorMessage = TEXT('Invalid access or secret key. Please try again.');
          } else {
            this.errorMessage = _.get(err, 'error.detail', err.message);
          }
        }
      });
  }
}
