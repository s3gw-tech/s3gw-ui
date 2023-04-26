import { Component, OnInit, ViewChild } from '@angular/core';
import { AbstractControl, AsyncValidatorFn, ValidationErrors } from '@angular/forms';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { marker as TEXT } from '@ngneat/transloco-keys-manager/marker';
import * as _ from 'lodash';
import { Observable, of, timer } from 'rxjs';
import { delayWhen, map, switchMap } from 'rxjs/operators';

import { extractErrorDescription, format } from '~/app/functions.helper';
import { DeclarativeFormComponent } from '~/app/shared/components/declarative-form/declarative-form.component';
import { PageStatus } from '~/app/shared/components/page-wrapper/page-wrapper.component';
import { S3gwValidators } from '~/app/shared/forms/validators';
import { DeclarativeFormConfig } from '~/app/shared/models/declarative-form-config.type';
import { IsDirty } from '~/app/shared/models/is-dirty.interface';
import { AdminOpsBucketService, Bucket } from '~/app/shared/services/api/admin-ops-bucket.service';
import { AdminOpsUserService } from '~/app/shared/services/api/admin-ops-user.service';
import { S3BucketName } from '~/app/shared/services/api/s3-bucket.service';

@Component({
  selector: 's3gw-bucket-form-page',
  templateUrl: './bucket-form-page.component.html',
  styleUrls: ['./bucket-form-page.component.scss']
})
export class BucketFormPageComponent implements OnInit, IsDirty {
  @ViewChild(DeclarativeFormComponent, { static: false })
  form!: DeclarativeFormComponent;

  public pageStatus: PageStatus = PageStatus.none;
  public loadingErrorText: string = TEXT('Failed to load bucket.');
  public savingErrorText: string = TEXT('Failed to save bucket.');
  public config: DeclarativeFormConfig = {
    fields: []
  };

  private readonly editing: boolean;
  private listIds$: Observable<string[]>;
  private ownerOptions: Record<any, string> = {};

  constructor(
    private route: ActivatedRoute,
    private adminOpsBucketService: AdminOpsBucketService,
    private adminOpsUserService: AdminOpsUserService,
    private router: Router
  ) {
    this.editing = this.router.url.startsWith(`/admin/buckets/edit`);
    this.createForm();
    (this.listIds$ = this.adminOpsUserService.listIds()).subscribe({
      next: (users: string[]) => {
        // Update the options of the 'owner' field.
        const field = _.find(this.config.fields, ['name', 'owner']);
        if (!_.isUndefined(field)) {
          field.options = _.reduce(
            users,
            (result, user: string) => {
              _.set(result, user, user);
              return result;
            },
            {}
          );
        }
      }
    });
  }

  ngOnInit(): void {
    this.route.params.subscribe((value: Params) => {
      if (!_.has(value, 'bid')) {
        this.pageStatus = PageStatus.ready;
        return;
      }
      const bid: S3BucketName = decodeURIComponent(value['bid']);
      this.pageStatus = PageStatus.loading;
      this.adminOpsBucketService
        .get(bid)
        .pipe(
          // Wait until the list of owners has been loaded and the form
          // configuration has been updated.
          delayWhen(() => this.listIds$)
        )
        .subscribe({
          next: (bucket: Bucket) => {
            this.pageStatus = PageStatus.ready;
            this.form.patchValues(bucket, false);
            // Disable various controls.
            if (bucket.object_lock_enabled) {
              this.form.getControl('versioning_enabled')?.disable();
              this.form.getControl('object_lock_enabled')?.disable();
            } else {
              this.form.getControl('retention_enabled')?.disable();
            }
            if (bucket.retention_enabled) {
              this.form.getControl('retention_enabled')?.disable();
            }
            if (this.editing && bucket.versioning_enabled) {
              this.form.getControl('versioning_enabled')?.disable();
            }
          },
          error: (err) => {
            this.pageStatus = PageStatus.loadingError;
            this.loadingErrorText = format(TEXT('Failed to load bucket ({{ errorDesc }}).'), {
              errorDesc: extractErrorDescription(err)
            });
          }
        });
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
          click: () => this.router.navigate(['/admin/buckets'])
        },
        {
          type: 'submit',
          text: this.editing ? TEXT('Update') : TEXT('Create'),
          click: () => {
            if (this.editing) {
              this.updateBucket();
            } else {
              this.createBucket();
            }
          }
        }
      ],
      fields: [
        {
          type: 'hidden',
          name: 'id',
          value: '',
          submitValue: this.editing
        },
        {
          type: 'text',
          name: 'bucket',
          label: TEXT('Name'),
          hint: TEXT('The name of the bucket.'),
          value: '',
          readonly: this.editing,
          autofocus: !this.editing,
          validators: {
            required: true,
            custom: S3gwValidators.bucketName(),
            asyncCustom: this.uniqueBucketName()
          }
        },
        {
          type: 'select',
          name: 'owner',
          label: TEXT('Owner'),
          hint: TEXT('The owner of the bucket.'),
          value: '',
          readonly: this.editing,
          options: this.ownerOptions,
          validators: {
            required: true
          }
        },
        {
          type: 'tags',
          name: 'tags',
          label: TEXT('Tags'),
          value: [],
          validators: {
            constraint: {
              constraint: {
                operator: 'le',
                arg0: {
                  operator: 'length',
                  arg0: { prop: 'tags' }
                },
                arg1: 10
              },
              errorMessage: TEXT('Only up to 10 tags are allowed.')
            }
          }
        },
        // -------------- Versioning --------------
        {
          type: 'divider',
          title: TEXT('Versioning')
        },
        {
          type: 'checkbox',
          name: 'versioning_enabled',
          label: TEXT('Enabled'),
          hint: TEXT('Enable versioning for the objects in this bucket.'),
          value: false,
          modifiers: [
            {
              type: 'value',
              constraint: {
                operator: 'truthy',
                arg0: { prop: 'object_lock_enabled' }
              },
              data: true
            },
            {
              type: 'value',
              constraint: {
                operator: 'truthy',
                arg0: { prop: 'retention_enabled' }
              },
              data: true
            }
          ]
        },
        // -------------- Object Locking --------------
        {
          type: 'divider',
          title: TEXT('Object Locking')
        },
        {
          type: 'checkbox',
          name: 'object_lock_enabled',
          label: TEXT('Enabled'),
          hint: TEXT(
            'Enable object locking only if you need to prevent objects from being deleted. Can only be enabled during bucket creation.'
          ),
          value: false,
          readonly: this.editing,
          modifiers: [
            {
              type: 'value',
              constraint: {
                operator: 'falsy',
                arg0: { prop: 'versioning_enabled' }
              },
              data: false
            },
            {
              type: 'value',
              constraint: {
                operator: 'truthy',
                arg0: { prop: 'retention_enabled' }
              },
              data: true
            }
          ]
        },
        {
          type: 'checkbox',
          name: 'retention_enabled',
          label: TEXT('Retention'),
          hint: TEXT('Prevent object deletion for a period of time.'),
          value: false,
          modifiers: [
            {
              type: 'value',
              constraint: {
                operator: 'falsy',
                arg0: { prop: 'versioning_enabled' }
              },
              data: false
            },
            {
              type: 'value',
              constraint: {
                operator: 'falsy',
                arg0: { prop: 'object_lock_enabled' }
              },
              data: false
            }
          ]
        },
        {
          type: 'select',
          name: 'retention_mode',
          label: TEXT('Mode'),
          value: 'COMPLIANCE',
          options: {
            /* eslint-disable @typescript-eslint/naming-convention */
            COMPLIANCE: TEXT('Compliance'),
            GOVERNANCE: TEXT('Governance')
            /* eslint-enable @typescript-eslint/naming-convention */
          },
          validators: {
            requiredIf: {
              operator: 'truthy',
              arg0: { prop: 'retention_enabled' }
            }
          },
          modifiers: [
            {
              type: 'visible',
              constraint: {
                operator: 'truthy',
                arg0: { prop: 'retention_enabled' }
              }
            }
          ]
        },
        {
          type: 'container',
          fields: [
            {
              type: 'number',
              name: 'retention_validity',
              label: TEXT('Validity'),
              value: 180,
              modifiers: [
                {
                  type: 'visible',
                  constraint: {
                    operator: 'truthy',
                    arg0: { prop: 'retention_enabled' }
                  }
                }
              ],
              validators: {
                min: 1,
                max: 65535,
                requiredIf: {
                  operator: 'truthy',
                  arg0: { prop: 'retention_enabled' }
                }
              }
            },
            {
              type: 'select',
              name: 'retention_unit',
              label: TEXT('Unit'),
              value: 'Days',
              options: {
                /* eslint-disable @typescript-eslint/naming-convention */
                Days: TEXT('Days'),
                Years: TEXT('Years')
                /* eslint-enable @typescript-eslint/naming-convention */
              },
              modifiers: [
                {
                  type: 'visible',
                  constraint: {
                    operator: 'truthy',
                    arg0: { prop: 'retention_enabled' }
                  }
                }
              ]
            }
          ]
        }
      ]
    };
  }

  private createBucket(): void {
    const bucket: Bucket = this.form.values as Bucket;
    this.pageStatus = PageStatus.saving;
    this.adminOpsBucketService.create(bucket).subscribe({
      next: () => {
        this.form.markAsPristine();
        this.router.navigate(['/admin/buckets']);
      },
      error: (err) => {
        this.pageStatus = PageStatus.savingError;
        this.savingErrorText = format(TEXT('Failed to save bucket ({{ errorDesc }}).'), {
          errorDesc: extractErrorDescription(err)
        });
      }
    });
  }

  private updateBucket(): void {
    const bucket: Partial<Bucket> = this.form.values;
    this.pageStatus = PageStatus.saving;
    this.adminOpsBucketService.update(bucket).subscribe({
      next: () => {
        this.form.markAsPristine();
        this.router.navigate(['/admin/buckets']);
      },
      error: (err) => {
        this.pageStatus = PageStatus.savingError;
        this.savingErrorText = format(TEXT('Failed to save bucket ({{ errorDesc }}).'), {
          errorDesc: extractErrorDescription(err)
        });
      }
    });
  }

  private uniqueBucketName(): AsyncValidatorFn {
    return (control: AbstractControl): Observable<ValidationErrors | null> => {
      if (control.pristine || _.isEmpty(control.value)) {
        return of(null);
      }
      return timer(200).pipe(
        switchMap(() => this.adminOpsBucketService.exists(control.value)),
        map((resp: boolean) => {
          if (!resp) {
            return null;
          } else {
            return { custom: TEXT('The name already exists.') };
          }
        })
      );
    };
  }
}
