import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { TranslocoModule } from '@ngneat/transloco';

import { AdminPagesModule } from '~/app/pages/admin/admin-pages.module';
import { BucketLifecycleDatatablePageComponent } from '~/app/pages/shared/bucket/bucket-lifecycle-datatable-page/bucket-lifecycle-datatable-page.component';
import { LoginPageComponent } from '~/app/pages/shared/login-page/login-page.component';
import { NotFoundPageComponent } from '~/app/pages/shared/not-found-page/not-found-page.component';
import { UserPagesModule } from '~/app/pages/user/user-pages.module';
import { SharedModule } from '~/app/shared/shared.module';

@NgModule({
  declarations: [LoginPageComponent, NotFoundPageComponent, BucketLifecycleDatatablePageComponent],
  imports: [
    AdminPagesModule,
    CommonModule,
    NgbModule,
    RouterModule,
    SharedModule,
    TranslocoModule,
    UserPagesModule
  ]
})
export class PagesModule {}
