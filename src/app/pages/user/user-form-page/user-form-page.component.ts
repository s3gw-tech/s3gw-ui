import { Component, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { marker as TEXT } from '@ngneat/transloco-keys-manager/marker';
import _ from 'lodash';

import { DeclarativeFormComponent } from '~/app/shared/components/declarative-form/declarative-form.component';
import { PageStatus } from '~/app/shared/components/page-status/page-status.component';
import { DeclarativeFormConfig } from '~/app/shared/models/declarative-form-config.type';
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
          label: TEXT('Username'),
          value: '',
          readonly: editing,
          autofocus: true,
          validators: {
            required: true
          }
        },
        {
          type: 'text',
          name: 'display_name',
          label: TEXT('Full Name'),
          value: '',
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
          type: 'number',
          name: 'max_buckets',
          label: TEXT('Max. Buckets'),
          value: 1000,
          validators: {
            min: 1,
            patternType: 'numeric'
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
    user.user_id = this.form.values['user_id'];
    this.userService.update(user).subscribe({
      next: () => {
        this.router.navigate(['/user']);
      },
      error: () => {
        this.pageStatus = PageStatus.savingError;
      }
    });
  }
}
