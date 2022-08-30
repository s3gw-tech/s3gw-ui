import { Component, OnInit, ViewChild } from '@angular/core';
import { AbstractControl, AsyncValidatorFn, ValidationErrors } from '@angular/forms';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { marker as TEXT } from '@ngneat/transloco-keys-manager/marker';
import _ from 'lodash';
import { Observable, of, timer } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';

import { DeclarativeFormComponent } from '~/app/shared/components/declarative-form/declarative-form.component';
import { PageStatus } from '~/app/shared/components/page-status/page-status.component';
import { DeclarativeFormConfig } from '~/app/shared/models/declarative-form-config.type';
import { Bucket, BucketService } from '~/app/shared/services/api/bucket.service';
import { UserService } from '~/app/shared/services/api/user.service';

@Component({
  selector: 's3gw-bucket-form-page',
  templateUrl: './bucket-form-page.component.html',
  styleUrls: ['./bucket-form-page.component.scss']
})
export class BucketFormPageComponent implements OnInit {
  @ViewChild(DeclarativeFormComponent, { static: false })
  form!: DeclarativeFormComponent;

  public pageStatus: PageStatus = PageStatus.none;
  public config: DeclarativeFormConfig = {
    fields: []
  };

  private ownerOptions: Record<any, string> = {};

  constructor(
    private route: ActivatedRoute,
    private bucketService: BucketService,
    private router: Router,
    private userService: UserService
  ) {
    this.createForm(this.router.url.startsWith(`/bucket/edit`));
    this.userService.listIds().subscribe({
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
      const bid = decodeURIComponent(value['bid']);
      this.pageStatus = PageStatus.loading;
      this.bucketService.get(bid).subscribe({
        next: (bucket: Bucket) => {
          this.pageStatus = PageStatus.ready;
          this.form.patchValues(bucket);
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
          click: () => this.router.navigate(['/bucket'])
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
          type: 'text',
          name: 'id',
          label: TEXT('ID'),
          value: '',
          readonly: true,
          submitValue: editing,
          groupClass: editing ? '' : 'd-none',
          hasCopyToClipboardButton: true
        },
        {
          type: 'text',
          name: 'bucket',
          label: TEXT('Name'),
          hint: TEXT('The name of the bucket.'),
          value: '',
          readonly: editing,
          autofocus: !editing,
          validators: {
            required: true,
            asyncCustom: this.bucketNameValidator()
          }
        },
        {
          type: 'select',
          name: 'owner',
          label: TEXT('Owner'),
          hint: TEXT('The owner of the bucket.'),
          value: '',
          autofocus: editing,
          options: this.ownerOptions,
          validators: {
            required: true
          }
        }
      ]
    };
  }

  private createBucket(): void {
    const bucket: Bucket = this.form.values as Bucket;
    this.bucketService.create(bucket).subscribe({
      next: () => {
        this.router.navigate(['/bucket']);
      },
      error: () => {
        this.pageStatus = PageStatus.savingError;
      }
    });
  }

  private updateBucket(): void {
    const user: Partial<Bucket> = this.form.values;
    this.bucketService.update(user).subscribe({
      next: () => {
        this.router.navigate(['/bucket']);
      },
      error: () => {
        this.pageStatus = PageStatus.savingError;
      }
    });
  }

  private bucketNameValidator(): AsyncValidatorFn {
    return (control: AbstractControl): Observable<ValidationErrors | null> => {
      if (control.pristine || _.isEmpty(control.value)) {
        return of(null);
      }
      return timer(200).pipe(
        switchMap(() => this.bucketService.exists(control.value)),
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
