import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { TranslocoModule } from '@ngneat/transloco';

import { DashboardModule } from '~/app/dashboard/dashboard.module';
import { AdminPagesRoutingModule } from '~/app/pages/admin/admin-pages-routing.module';
import { BucketDatatablePageComponent } from '~/app/pages/admin/bucket/bucket-datatable-page/bucket-datatable-page.component';
import { BucketFormPageComponent } from '~/app/pages/admin/bucket/bucket-form-page/bucket-form-page.component';
import { DashboardPageComponent } from '~/app/pages/admin/dashboard-page/dashboard-page.component';
import { UserDatatablePageComponent } from '~/app/pages/admin/user/user-datatable-page/user-datatable-page.component';
import { UserFormPageComponent } from '~/app/pages/admin/user/user-form-page/user-form-page.component';
import { UserKeyDatatablePageComponent } from '~/app/pages/admin/user/user-key-datatable-page/user-key-datatable-page.component';
import { UserKeyFormPageComponent } from '~/app/pages/admin/user/user-key-form-page/user-key-form-page.component';
import { SharedModule } from '~/app/shared/shared.module';

@NgModule({
  declarations: [
    DashboardPageComponent,
    UserDatatablePageComponent,
    UserKeyDatatablePageComponent,
    UserFormPageComponent,
    UserKeyFormPageComponent,
    BucketDatatablePageComponent,
    BucketFormPageComponent
  ],
  imports: [
    AdminPagesRoutingModule,
    CommonModule,
    DashboardModule,
    NgbModule,
    RouterModule,
    SharedModule,
    TranslocoModule
  ],
  exports: [NgbModule, SharedModule, TranslocoModule]
})
export class AdminPagesModule {}
