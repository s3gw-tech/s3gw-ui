import { Component, OnInit, ViewChild } from '@angular/core';
import { AbstractControl, AsyncValidatorFn, ValidationErrors } from '@angular/forms';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { marker as TEXT } from '@ngneat/transloco-keys-manager/marker';
import _ from 'lodash';
import { Observable, of, timer } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';

import { DeclarativeFormComponent } from '~/app/shared/components/declarative-form/declarative-form.component';
import { PageStatus } from '~/app/shared/components/page-status/page-status.component';
import {
  DeclarativeFormConfig,
  DeclarativeFormValues
} from '~/app/shared/models/declarative-form-config.type';
import { User, UserService } from '~/app/shared/services/api/user.service';

@Component({
  selector: 's3gw-user-form-page',
  templateUrl: './user-form-page.component.html',
  styleUrls: ['./user-form-page.component.scss']
})
export class UserFormPageComponent implements OnInit {
  @ViewChild(DeclarativeFormComponent, { static: false })
  form!: DeclarativeFormComponent;

  public pageStatus: PageStatus = PageStatus.none;
  public config: DeclarativeFormConfig = {
    fields: []
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private userService: UserService
  ) {
    this.createForm(this.router.url.startsWith(`/user/edit`));
  }

  ngOnInit(): void {
    this.route.params.subscribe((value: Params) => {
      if (!_.has(value, 'uid')) {
        this.pageStatus = PageStatus.ready;
        return;
      }
      const uid = decodeURIComponent(value['uid']);
      this.pageStatus = PageStatus.loading;
      this.userService.get(uid).subscribe({
        next: (user: User) => {
          this.pageStatus = PageStatus.ready;
          this.patchMaxBuckets(user, true);
          this.form.patchValues(user);
        },
        error: () => {
          this.pageStatus = PageStatus.loadingError;
        }
      });
    });
  }

  private createForm(editing: boolean) {
    this.config = {
      buttons: [
        {
          type: 'default',
          text: TEXT('Cancel'),
          click: () => this.router.navigate(['/user'])
        },
        {
          type: 'submit',
          text: editing ? TEXT('Update') : TEXT('Create'),
          click: () => {
            if (editing) {
              this.updateUser();
            } else {
              this.createUser();
            }
          }
        }
      ],
      fields: [
        {
          type: 'text',
          name: 'user_id',
          label: TEXT('User ID'),
          value: '',
          readonly: editing,
          autofocus: !editing,
          validators: {
            required: true,
            asyncCustom: this.userIdValidator()
          }
        },
        {
          type: 'text',
          name: 'display_name',
          label: TEXT('Full Name'),
          value: '',
          autofocus: editing,
          validators: {
            required: true
          }
        },
        {
          type: 'text',
          name: 'email',
          label: TEXT('Email'),
          value: '',
          validators: {
            patternType: 'email'
          }
        },
        {
          type: 'select',
          name: 'max_buckets_mode',
          label: TEXT('Max. Buckets'),
          value: 'custom',
          submitValue: false,
          options: {
            disabled: TEXT('Disabled'),
            unlimited: TEXT('Unlimited'),
            custom: TEXT('Custom')
          },
          validators: {
            required: true
          }
        },
        {
          type: 'number',
          name: 'max_buckets',
          value: 1000,
          modifiers: [
            {
              type: 'hidden',
              constraint: {
                operator: 'ne',
                arg0: { prop: 'max_buckets_mode' },
                arg1: 'custom'
              }
            }
          ],
          validators: {
            min: 1,
            patternType: 'numeric',
            requiredIf: {
              operator: 'eq',
              arg0: { prop: 'max_buckets_mode' },
              arg1: 'custom'
            }
          }
        },
        {
          type: 'checkbox',
          name: 'suspended',
          label: TEXT('Suspended'),
          value: false
        }
      ]
    };
  }

  private createUser(): void {
    const user: User = this.form.values as User;
    this.patchMaxBuckets(user);
    this.userService.create(user).subscribe({
      next: () => {
        this.router.navigate(['/user']);
      },
      error: () => {
        this.pageStatus = PageStatus.savingError;
      }
    });
  }

  private updateUser(): void {
    const user: Partial<User> = this.form.modifiedValues;
    this.patchUserId(user);
    this.patchMaxBuckets(user);
    this.userService.update(user).subscribe({
      next: () => {
        this.router.navigate(['/user']);
      },
      error: () => {
        this.pageStatus = PageStatus.savingError;
      }
    });
  }

  private patchUserId(user: Partial<User>): void {
    const values: DeclarativeFormValues = this.form.values;
    user.user_id = values['user_id'];
  }

  private patchMaxBuckets(user: DeclarativeFormValues, loading: boolean = false): void {
    if (loading) {
      switch (user['max_buckets']) {
        case -1:
          user['max_buckets_mode'] = 'disabled';
          // Set default value to display a valid value when the user
          // switches back to 'custom ' mode.
          user['max_buckets'] = 1000;
          break;
        case 0:
          user['max_buckets_mode'] = 'unlimited';
          // Set default value to display a valid value when the user
          // switches back to 'custom ' mode.
          user['max_buckets'] = 1000;
          break;
        default:
          user['max_buckets_mode'] = 'custom';
          break;
      }
    } else {
      const values = this.form.allValues;
      switch (values['max_buckets_mode']) {
        case 'disabled':
          user['max_buckets'] = -1;
          break;
        case 'unlimited':
          user['max_buckets'] = 0;
          break;
      }
    }
  }

  private userIdValidator(): AsyncValidatorFn {
    return (control: AbstractControl): Observable<ValidationErrors | null> => {
      if (control.pristine || _.isEmpty(control.value)) {
        return of(null);
      }
      return timer(200).pipe(
        switchMap(() => this.userService.exists(control.value)),
        map((resp: boolean) => {
          if (!resp) {
            return null;
          } else {
            return { custom: TEXT('The user ID already exists.') };
          }
        })
      );
    };
  }
}
