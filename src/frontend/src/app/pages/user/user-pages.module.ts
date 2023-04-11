import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { TranslocoModule } from '@ngneat/transloco';

import { DashboardModule } from '~/app/dashboard/dashboard.module';
import { BucketDatatablePageComponent } from '~/app/pages/user/bucket/bucket-datatable-page/bucket-datatable-page.component';
import { BucketFormPageComponent } from '~/app/pages/user/bucket/bucket-form-page/bucket-form-page.component';
import { DashboardPageComponent } from '~/app/pages/user/dashboard-page/dashboard-page.component';
import { ObjectDatatablePageComponent } from '~/app/pages/user/object/object-datatable-page/object-datatable-page.component';
import { UserPagesRoutingModule } from '~/app/pages/user/user-pages-routing.module';
import { SharedModule } from '~/app/shared/shared.module';

@NgModule({
  declarations: [
    BucketDatatablePageComponent,
    BucketFormPageComponent,
    DashboardPageComponent,
    ObjectDatatablePageComponent
  ],
  imports: [
    UserPagesRoutingModule,
    CommonModule,
    DashboardModule,
    NgbModule,
    RouterModule,
    SharedModule,
    TranslocoModule
  ],
  exports: [DashboardModule, NgbModule, SharedModule, TranslocoModule]
})
export class UserPagesModule {}
