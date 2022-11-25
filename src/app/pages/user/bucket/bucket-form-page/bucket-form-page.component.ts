import { Component, OnInit, ViewChild } from '@angular/core';
import { AbstractControl, AsyncValidatorFn, ValidationErrors } from '@angular/forms';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { marker as TEXT } from '@ngneat/transloco-keys-manager/marker';
import * as _ from 'lodash';
import { Observable, of, timer } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';

import { extractErrorCode, format } from '~/app/functions.helper';
import { DeclarativeFormComponent } from '~/app/shared/components/declarative-form/declarative-form.component';
import { PageStatus } from '~/app/shared/components/page-wrapper/page-wrapper.component';
import { S3gwValidators } from '~/app/shared/forms/validators';
import { DeclarativeFormConfig } from '~/app/shared/models/declarative-form-config.type';
import { IsDirty } from '~/app/shared/models/is-dirty.interface';
import { S3Bucket, S3BucketService } from '~/app/shared/services/api/s3-bucket.service';

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

  constructor(
    private route: ActivatedRoute,
    private s3BucketService: S3BucketService,
    private router: Router
  ) {
    this.createForm(this.router.url.startsWith(`/user/buckets/edit`));
  }

  ngOnInit(): void {
    this.route.params.subscribe((value: Params) => {
      if (!_.has(value, 'bid')) {
        this.pageStatus = PageStatus.ready;
        return;
      }
      const bid = decodeURIComponent(value['bid']);
      this.pageStatus = PageStatus.loading;
      this.s3BucketService.get(bid).subscribe({
        next: (bucket: S3Bucket) => {
          this.pageStatus = PageStatus.ready;
          this.form.patchValues(bucket, false);
        },
        error: (err) => {
          this.pageStatus = PageStatus.loadingError;
          this.loadingErrorText = format(TEXT('Failed to load bucket (code={{ code }}).'), {
            code: extractErrorCode(err)
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
          type: 'checkbox',
          name: 'Versioning',
          label: TEXT('Versioning'),
          hint: TEXT('Enable versioning for the objects in this bucket.'),
          value: false
        }
      ]
    };
  }

  private createBucket(): void {
    const bucket: S3Bucket = this.form.values as S3Bucket;
    this.pageStatus = PageStatus.saving;
    this.s3BucketService.create(bucket).subscribe({
      next: () => {
        this.form.markAsPristine();
        this.router.navigate(['/buckets']);
      },
      error: (err) => {
        this.pageStatus = PageStatus.savingError;
        this.savingErrorText = format(TEXT('Failed to save bucket (code={{ code }}).'), {
          code: extractErrorCode(err)
        });
      }
    });
  }

  private updateBucket(): void {
    const bucket: Partial<S3Bucket> = this.form.values;
    this.pageStatus = PageStatus.saving;
    this.s3BucketService.update(bucket).subscribe({
      next: () => {
        this.form.markAsPristine();
        this.router.navigate(['/buckets']);
      },
      error: (err) => {
        this.pageStatus = PageStatus.savingError;
        this.savingErrorText = format(TEXT('Failed to save bucket (code={{ code }}).'), {
          code: extractErrorCode(err)
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
