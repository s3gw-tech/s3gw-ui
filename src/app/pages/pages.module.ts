import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { TranslocoModule } from '@ngneat/transloco';

import { DashboardModule } from '~/app/dashboard/dashboard.module';
import { BucketDatatablePageComponent } from '~/app/pages/bucket/bucket-datatable-page/bucket-datatable-page.component';
import { BucketFormPageComponent } from '~/app/pages/bucket/bucket-form-page/bucket-form-page.component';
import { DashboardPageComponent } from '~/app/pages/dashboard-page/dashboard-page.component';
import { LoginPageComponent } from '~/app/pages/login-page/login-page.component';
import { NotFoundPageComponent } from '~/app/pages/not-found-page/not-found-page.component';
import { UserDatatablePageComponent } from '~/app/pages/user/user-datatable-page/user-datatable-page.component';
import { UserFormPageComponent } from '~/app/pages/user/user-form-page/user-form-page.component';
import { UserKeyDatatablePageComponent } from '~/app/pages/user/user-key-datatable-page/user-key-datatable-page.component';
import { UserKeyFormPageComponent } from '~/app/pages/user/user-key-form-page/user-key-form-page.component';
import { SharedModule } from '~/app/shared/shared.module';

@NgModule({
  declarations: [
    DashboardPageComponent,
    LoginPageComponent,
    NotFoundPageComponent,
    UserDatatablePageComponent,
    UserKeyDatatablePageComponent,
    UserFormPageComponent,
    UserKeyFormPageComponent,
    BucketDatatablePageComponent,
    BucketFormPageComponent
  ],
  imports: [
    CommonModule,
    DashboardModule,
    NgbModule,
    RouterModule,
    SharedModule,
    TranslocoModule
  ]
})
export class PagesModule {}
