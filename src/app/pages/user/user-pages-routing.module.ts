import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { marker as TEXT } from '@ngneat/transloco-keys-manager/marker';

import { BucketDatatablePageComponent } from '~/app/pages/user/bucket/bucket-datatable-page/bucket-datatable-page.component';
import { BucketFormPageComponent } from '~/app/pages/user/bucket/bucket-form-page/bucket-form-page.component';
import { DashboardPageComponent } from '~/app/pages/user/dashboard-page/dashboard-page.component';

const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  {
    path: 'dashboard',
    data: { breadcrumb: TEXT('Dashboard'), title: TEXT('Dashboard') },
    component: DashboardPageComponent
  },
  {
    path: 'buckets',
    data: { breadcrumb: TEXT('Buckets'), title: TEXT('Buckets') },
    children: [
      {
        path: '',
        component: BucketDatatablePageComponent
      },
      {
        path: 'create',
        data: { breadcrumb: TEXT('Create'), title: TEXT('Create Bucket') },
        component: BucketFormPageComponent
      },
      {
        path: 'edit/:bid',
        data: { breadcrumb: TEXT('Edit'), title: TEXT('Edit Bucket') },
        component: BucketFormPageComponent
      }
    ]
  }
];

@NgModule({
  exports: [RouterModule],
  imports: [RouterModule.forChild(routes)]
})
export class UserPagesRoutingModule {}
