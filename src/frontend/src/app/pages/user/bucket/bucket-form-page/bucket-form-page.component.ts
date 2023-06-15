import { Component, OnInit, ViewChild } from '@angular/core';
import { AbstractControl, AsyncValidatorFn, ValidationErrors } from '@angular/forms';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { marker as TEXT } from '@ngneat/transloco-keys-manager/marker';
import * as AWS from 'aws-sdk';
import * as _ from 'lodash';
import { Observable, of, timer } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';

import { extractErrorDescription, format } from '~/app/functions.helper';
import { DeclarativeFormComponent } from '~/app/shared/components/declarative-form/declarative-form.component';
import { PageStatus } from '~/app/shared/components/page-wrapper/page-wrapper.component';
import { S3gwValidators } from '~/app/shared/forms/validators';
import { DeclarativeFormConfig } from '~/app/shared/models/declarative-form-config.type';
import { IsDirty } from '~/app/shared/models/is-dirty.interface';
import { PageAction } from '~/app/shared/models/page-action.type';
import { S3BucketAttributes, S3BucketService } from '~/app/shared/services/api/s3-bucket.service';

@Component({
  selector: 's3gw-bucket-form-page',
  templateUrl: './bucket-form-page.component.html',
  styleUrls: ['./bucket-form-page.component.scss']
})
export class BucketFormPageComponent implements OnInit, IsDirty {
  @ViewChild(DeclarativeFormComponent, { static: false })
  form!: DeclarativeFormComponent;

  public pageActions: PageAction[] = [];
  public pageStatus: PageStatus = PageStatus.none;
  public loadingErrorText: string = TEXT('Failed to load bucket.');
  public savingErrorText: string = TEXT('Failed to save bucket.');
  public config: DeclarativeFormConfig = {
    fields: []
  };

  constructor(
    private route: ActivatedRoute,
    private s3BucketService: S3BucketService,
    private router: Router
  ) {
    this.createForm(this.router.url.startsWith(`/buckets/edit`));
  }

  ngOnInit(): void {
    this.route.params.subscribe((value: Params) => {
      if (!_.has(value, 'bid')) {
        this.pageStatus = PageStatus.ready;
        return;
      }
      const bid: AWS.S3.Types.BucketName = decodeURIComponent(value['bid']);
      this.pageActions = [
        {
          type: 'button',
          text: TEXT('Explore'),
          callback: () => this.router.navigate([`/objects/${bid}`])
        }
      ];
      this.pageStatus = PageStatus.loading;
      this.s3BucketService.getAttributes(bid).subscribe({
        next: (bucket: S3BucketAttributes) => {
          this.pageStatus = PageStatus.ready;
          this.form.patchValues(bucket, false);
          // Disable various controls.
          if (bucket.ObjectLockEnabled) {
            this.form.getControl('VersioningEnabled')?.disable();
            this.form.getControl('ObjectLockEnabled')?.disable();
          } else {
            this.form.getControl('RetentionEnabled')?.disable();
          }
          if (bucket.RetentionEnabled) {
            this.form.getControl('RetentionEnabled')?.disable();
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

  private createForm(editing: boolean) {
    this.config = {
      buttons: [
        {
          type: 'default',
          text: TEXT('Cancel'),
          click: () => this.router.navigate(['/buckets'])
        },
        {
          type: 'submit',
          text: editing ? TEXT('Update') : TEXT('Create'),
          click: () => {
            if (editing) {
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
          submitValue: editing
        },
        {
          type: 'text',
          name: 'Name',
          label: TEXT('Name'),
          hint: TEXT('The name of the bucket.'),
          value: '',
          readonly: editing,
          autofocus: !editing,
          validators: {
            required: true,
            custom: S3gwValidators.bucketName(),
            asyncCustom: this.uniqueBucketName()
          }
        },
        {
          type: 'tags',
          name: 'TagSet',
          label: TEXT('Tags'),
          value: [],
          validators: {
            constraint: {
              constraint: {
                operator: 'le',
                arg0: {
                  operator: 'length',
                  arg0: { prop: 'TagSet' }
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
          name: 'VersioningEnabled',
          label: TEXT('Enabled'),
          hint: TEXT('Enable versioning for the objects in this bucket.'),
          value: false,
          modifiers: [
            {
              type: 'value',
              constraint: {
                operator: 'truthy',
                arg0: { prop: 'ObjectLockEnabled' }
              },
              data: true
            },
            {
              type: 'value',
              constraint: {
                operator: 'truthy',
                arg0: { prop: 'RetentionEnabled' }
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
          name: 'ObjectLockEnabled',
          label: TEXT('Enabled'),
          hint: TEXT(
            'Enable object locking only if you need to prevent objects from being deleted. Can only be enabled while bucket creation.'
          ),
          value: false,
          readonly: editing,
          modifiers: [
            {
              type: 'value',
              constraint: {
                operator: 'falsy',
                arg0: { prop: 'VersioningEnabled' }
              },
              data: false
            },
            {
              type: 'value',
              constraint: {
                operator: 'truthy',
                arg0: { prop: 'RetentionEnabled' }
              },
              data: true
            }
          ]
        },
        {
          type: 'checkbox',
          name: 'RetentionEnabled',
          label: TEXT('Retention'),
          hint: TEXT('Prevent object deletion for a period of time.'),
          value: false,
          modifiers: [
            {
              type: 'value',
              constraint: {
                operator: 'falsy',
                arg0: { prop: 'VersioningEnabled' }
              },
              data: false
            },
            {
              type: 'value',
              constraint: {
                operator: 'falsy',
                arg0: { prop: 'ObjectLockEnabled' }
              },
              data: false
            }
          ]
        },
        {
          type: 'select',
          name: 'RetentionMode',
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
              arg0: { prop: 'RetentionEnabled' }
            }
          },
          modifiers: [
            {
              type: 'visible',
              constraint: {
                operator: 'truthy',
                arg0: { prop: 'RetentionEnabled' }
              }
            }
          ]
        },
        {
          type: 'container',
          fields: [
            {
              type: 'number',
              name: 'RetentionValidity',
              label: TEXT('Validity'),
              value: 180,
              modifiers: [
                {
                  type: 'visible',
                  constraint: {
                    operator: 'truthy',
                    arg0: { prop: 'RetentionEnabled' }
                  }
                }
              ],
              validators: {
                min: 1,
                max: 65535,
                requiredIf: {
                  operator: 'truthy',
                  arg0: { prop: 'RetentionEnabled' }
                }
              }
            },
            {
              type: 'select',
              name: 'RetentionUnit',
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
                    arg0: { prop: 'RetentionEnabled' }
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
    const bucket: S3BucketAttributes = this.form.values as S3BucketAttributes;
    this.pageStatus = PageStatus.saving;
    this.s3BucketService.create(bucket).subscribe({
      next: () => {
        this.form.markAsPristine();
        this.router.navigate(['/buckets']);
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
    const bucket: Partial<S3BucketAttributes> = this.form.values;
    this.pageStatus = PageStatus.saving;
    this.s3BucketService.update(bucket).subscribe({
      next: () => {
        this.form.markAsPristine();
        this.router.navigate(['/buckets']);
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
        switchMap(() => this.s3BucketService.exists(control.value)),
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
