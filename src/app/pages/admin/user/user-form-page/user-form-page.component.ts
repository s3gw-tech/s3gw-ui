import { Component, OnInit, ViewChild } from '@angular/core';
import { AbstractControl, AsyncValidatorFn, ValidationErrors } from '@angular/forms';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { marker as TEXT } from '@ngneat/transloco-keys-manager/marker';
import * as _ from 'lodash';
import { concat, Observable, of, timer } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';

import { bytesToSize } from '~/app/functions.helper';
import { DeclarativeFormComponent } from '~/app/shared/components/declarative-form/declarative-form.component';
import { PageStatus } from '~/app/shared/components/page-status/page-status.component';
import {
  DeclarativeFormConfig,
  DeclarativeFormValues
} from '~/app/shared/models/declarative-form-config.type';
import { AdminOpsUserService, Quota, User } from '~/app/shared/services/api/admin-ops-user.service';

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
    private userService: AdminOpsUserService
  ) {
    this.createForm(this.router.url.startsWith(`/admin/users/edit`));
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
          this.patchQuota(user);
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
          click: () => this.router.navigate(['/admin/users'])
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
        },
        // -------------- User quota --------------
        {
          type: 'divider',
          title: TEXT('User Quota')
        },
        {
          type: 'paragraph',
          icon: 'mdi mdi-alert',
          iconClass: 's3gw-color-background-pair-warning',
          text: TEXT('This feature is non-functional right now.')
        },
        {
          type: 'checkbox',
          name: 'user_quota_enabled',
          label: TEXT('Enabled'),
          value: false,
          submitValue: false
        },
        {
          type: 'select',
          name: 'user_quota_max_size_mode',
          label: TEXT('Max. Size'),
          value: 'unlimited',
          submitValue: false,
          hint: TEXT('The maximum overall storage size.'),
          options: {
            unlimited: TEXT('Unlimited'),
            custom: TEXT('Custom')
          },
          modifiers: [
            {
              type: 'visible',
              constraint: {
                operator: 'truthy',
                arg0: { prop: 'user_quota_enabled' }
              }
            }
          ]
        },
        {
          type: 'binary',
          name: 'user_quota_max_size',
          submitValue: false,
          placeholder: '750 TiB',
          modifiers: [
            {
              type: 'visible',
              constraint: {
                operator: 'and',
                arg0: { operator: 'truthy', arg0: { prop: 'user_quota_enabled' } },
                arg1: { operator: 'eq', arg0: { prop: 'user_quota_max_size_mode' }, arg1: 'custom' }
              }
            }
          ],
          validators: {
            requiredIf: {
              operator: 'and',
              arg0: { operator: 'truthy', arg0: { prop: 'user_quota_enabled' } },
              arg1: { operator: 'eq', arg0: { prop: 'user_quota_max_size_mode' }, arg1: 'custom' }
            },
            patternType: 'binaryUnit'
          }
        },
        {
          type: 'select',
          name: 'user_quota_max_objects_mode',
          label: TEXT('Max. Objects'),
          value: 'unlimited',
          submitValue: false,
          hint: TEXT('The maximum total number of objects.'),
          options: {
            unlimited: TEXT('Unlimited'),
            custom: TEXT('Custom')
          },
          modifiers: [
            {
              type: 'visible',
              constraint: {
                operator: 'truthy',
                arg0: { prop: 'user_quota_enabled' }
              }
            }
          ]
        },
        {
          type: 'number',
          name: 'user_quota_max_objects',
          submitValue: false,
          modifiers: [
            {
              type: 'visible',
              constraint: {
                operator: 'and',
                arg0: { operator: 'truthy', arg0: { prop: 'user_quota_enabled' } },
                arg1: {
                  operator: 'eq',
                  arg0: { prop: 'user_quota_max_objects_mode' },
                  arg1: 'custom'
                }
              }
            }
          ],
          validators: {
            min: 0,
            patternType: 'numeric',
            requiredIf: {
              operator: 'and',
              arg0: { operator: 'truthy', arg0: { prop: 'user_quota_enabled' } },
              arg1: {
                operator: 'eq',
                arg0: { prop: 'user_quota_max_objects_mode' },
                arg1: 'custom'
              }
            }
          }
        },
        // -------------- Bucket quota --------------
        {
          type: 'divider',
          title: TEXT('Bucket Quota')
        },
        {
          type: 'paragraph',
          icon: 'mdi mdi-alert',
          iconClass: 's3gw-color-background-pair-warning',
          text: TEXT('This feature is non-functional right now.')
        },
        {
          type: 'checkbox',
          name: 'bucket_quota_enabled',
          label: TEXT('Enabled'),
          value: false,
          submitValue: false
        },
        {
          type: 'select',
          name: 'bucket_quota_max_size_mode',
          label: TEXT('Max. Size'),
          value: 'unlimited',
          submitValue: false,
          placeholder: '500 GiB',
          hint: TEXT('The maximum storage size a bucket can hold.'),
          options: {
            unlimited: TEXT('Unlimited'),
            custom: TEXT('Custom')
          },
          modifiers: [
            {
              type: 'visible',
              constraint: {
                operator: 'truthy',
                arg0: { prop: 'bucket_quota_enabled' }
              }
            }
          ]
        },
        {
          type: 'binary',
          name: 'bucket_quota_max_size',
          submitValue: false,
          placeholder: '750 GiB',
          modifiers: [
            {
              type: 'visible',
              constraint: {
                operator: 'and',
                arg0: { operator: 'truthy', arg0: { prop: 'bucket_quota_enabled' } },
                arg1: {
                  operator: 'eq',
                  arg0: { prop: 'bucket_quota_max_size_mode' },
                  arg1: 'custom'
                }
              }
            }
          ],
          validators: {
            requiredIf: {
              operator: 'and',
              arg0: { operator: 'truthy', arg0: { prop: 'bucket_quota_enabled' } },
              arg1: { operator: 'eq', arg0: { prop: 'bucket_quota_max_size_mode' }, arg1: 'custom' }
            },
            patternType: 'binaryUnit'
          }
        },
        {
          type: 'select',
          name: 'bucket_quota_max_objects_mode',
          label: TEXT('Max. Objects'),
          value: 'unlimited',
          submitValue: false,
          hint: TEXT('The maximum number of objects in a bucket.'),
          options: {
            unlimited: TEXT('Unlimited'),
            custom: TEXT('Custom')
          },
          modifiers: [
            {
              type: 'visible',
              constraint: {
                operator: 'truthy',
                arg0: { prop: 'bucket_quota_enabled' }
              }
            }
          ]
        },
        {
          type: 'number',
          name: 'bucket_quota_max_objects',
          submitValue: false,
          modifiers: [
            {
              type: 'visible',
              constraint: {
                operator: 'and',
                arg0: { operator: 'truthy', arg0: { prop: 'bucket_quota_enabled' } },
                arg1: {
                  operator: 'eq',
                  arg0: { prop: 'bucket_quota_max_objects_mode' },
                  arg1: 'custom'
                }
              }
            }
          ],
          validators: {
            min: 0,
            patternType: 'numeric',
            requiredIf: {
              operator: 'and',
              arg0: { operator: 'truthy', arg0: { prop: 'bucket_quota_enabled' } },
              arg1: {
                operator: 'eq',
                arg0: { prop: 'bucket_quota_max_objects_mode' },
                arg1: 'custom'
              }
            }
          }
        }
      ]
    };
  }

  private createUser(): void {
    const observables: Observable<any>[] = [];
    const user: User = this.form.values as User;
    this.patchMaxBuckets(user);
    observables.push(this.userService.create(user));
    if (this.isQuotaDirty('user')) {
      const quota: Quota = this.getQuota('user');
      observables.push(this.userService.updateQuota(user.user_id, quota));
    }
    if (this.isQuotaDirty('bucket')) {
      const quota: Quota = this.getQuota('bucket');
      observables.push(this.userService.updateQuota(user.user_id, quota));
    }
    // Execute all observables one after the other in series.
    concat(...observables).subscribe({
      next: () => {
        this.router.navigate(['/admin/users']);
      },
      error: () => {
        this.pageStatus = PageStatus.savingError;
      }
    });
  }

  private updateUser(): void {
    const observables: Observable<any>[] = [];
    const user: Partial<User> = this.form.modifiedValues;
    this.patchUserId(user);
    this.patchMaxBuckets(user);
    observables.push(this.userService.update(user));
    if (this.isQuotaDirty('user')) {
      const quota: Quota = this.getQuota('user');
      observables.push(this.userService.updateQuota(user.user_id!, quota));
    }
    if (this.isQuotaDirty('bucket')) {
      const quota: Quota = this.getQuota('bucket');
      observables.push(this.userService.updateQuota(user.user_id!, quota));
    }
    // Execute all observables one after the other in series.
    concat(...observables).subscribe({
      next: () => {
        this.router.navigate(['/admin/users']);
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

  /**
   * @param values The form values.
   * @param loading Set to `true` to patch/adapt loaded values to be
   *   displayed, otherwise set to `false` if the values should be
   *   adapted for saving.
   * @private
   */
  private patchMaxBuckets(values: DeclarativeFormValues, loading: boolean = false): void {
    if (loading) {
      switch (values['max_buckets']) {
        case -1:
          values['max_buckets_mode'] = 'disabled';
          // Set default value to display a valid value when the user
          // switches back to 'custom ' mode.
          values['max_buckets'] = 1000;
          break;
        case 0:
          values['max_buckets_mode'] = 'unlimited';
          // Set default value to display a valid value when the user
          // switches back to 'custom ' mode.
          values['max_buckets'] = 1000;
          break;
        default:
          values['max_buckets_mode'] = 'custom';
          break;
      }
    } else {
      const allValues = this.form.allValues;
      switch (allValues['max_buckets_mode']) {
        case 'disabled':
          values['max_buckets'] = -1;
          break;
        case 'unlimited':
          values['max_buckets'] = 0;
          break;
      }
    }
  }

  private patchQuota(values: DeclarativeFormValues): void {
    ['user', 'bucket'].forEach((type) => {
      const quota = values[`${type}_quota`];
      values[`${type}_quota_enabled`] = quota.enabled;
      if (quota.max_size < 0) {
        values[`${type}_quota_max_size_mode`] = 'unlimited';
        values[`${type}_quota_max_size`] = null;
      } else {
        values[`${type}_quota_max_size_mode`] = 'custom';
        values[`${type}_quota_max_size`] = bytesToSize(quota.max_size);
      }
      if (quota.max_objects < 0) {
        values[`${type}_quota_max_objects_mode`] = 'unlimited';
        values[`${type}_quota_max_objects`] = null;
      } else {
        values[`${type}_quota_max_objects_mode`] = 'custom';
        values[`${type}_quota_max_objects`] = quota.max_objects;
      }
    });
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

  /**
   * Helper function to check if the specified quota has been modified.
   *
   * @param type The quota type, `user` or `bucket`.
   * @private
   * @return Returns `true` if the specified quota has been modified,
   *   otherwise `false`.
   */
  private isQuotaDirty(type: 'user' | 'bucket'): boolean {
    return [
      `${type}_quota_enabled`,
      `${type}_quota_max_size_mode`,
      `${type}_quota_max_size`,
      `${type}_quota_max_objects_mode`,
      `${type}_quota_max_objects`
    ].some((path) => {
      const control = this.form.getControl(path);
      return control?.dirty ?? false;
    });
  }

  /**
   * Get the specified quota.
   *
   * @param type The quota type, `user` or `bucket`.
   * @private
   */
  private getQuota(type: 'user' | 'bucket'): Quota {
    const allValues = this.form.allValues;
    const quota: Quota = {
      type,
      enabled: allValues[`${type}_quota_enabled`]
    };
    switch (allValues[`${type}_quota_max_size_mode`]) {
      case 'unlimited':
        quota.max_size = -1;
        break;
      case 'custom':
        quota.max_size = allValues[`${type}_quota_max_size`];
        break;
    }
    switch (allValues[`${type}_quota_max_objects_mode`]) {
      case 'unlimited':
        quota.max_objects = -1;
        break;
      case 'custom':
        quota.max_objects = allValues[`${type}_quota_max_objects`];
        break;
    }
    return quota;
  }
}
