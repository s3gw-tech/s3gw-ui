import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { marker as TEXT } from '@ngneat/transloco-keys-manager/marker';

import { BucketLifecycleDatatablePageComponent } from '~/app/pages/shared/bucket/bucket-lifecycle-datatable-page/bucket-lifecycle-datatable-page.component';
import { BucketDatatablePageComponent } from '~/app/pages/user/bucket/bucket-datatable-page/bucket-datatable-page.component';
import { BucketFormPageComponent } from '~/app/pages/user/bucket/bucket-form-page/bucket-form-page.component';
import { DashboardPageComponent } from '~/app/pages/user/dashboard-page/dashboard-page.component';
import { ObjectDatatablePageComponent } from '~/app/pages/user/object/object-datatable-page/object-datatable-page.component';
import { ObjectVersionDatatablePageComponent } from '~/app/pages/user/object/object-version-datatable-page/object-version-datatable-page.component';
import { IsDirtyGuardService } from '~/app/shared/services/is-dirty-guard.service';

const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  {
    path: 'dashboard',
    data: { title: TEXT('Dashboard') },
    component: DashboardPageComponent
  },
  {
    path: 'buckets',
    data: { title: TEXT('Buckets') },
    children: [
      {
        path: '',
        component: BucketDatatablePageComponent
      },
      {
        path: 'create',
        data: { subTitle: TEXT('Create'), title: TEXT('Bucket:'), url: '..' },
        component: BucketFormPageComponent,
        canDeactivate: [IsDirtyGuardService]
      },
      {
        path: 'edit/:bid',
        data: { subTitle: '{{ bid }}', title: TEXT('Bucket:'), url: '../..' },
        component: BucketFormPageComponent,
        canDeactivate: [IsDirtyGuardService]
      },
      {
        path: 'lifecycle/:bid',
        data: { subTitle: '{{ bid }} - Lifecycle Rules', title: TEXT('Bucket:'), url: '../..' },
        component: BucketLifecycleDatatablePageComponent,
        canDeactivate: [IsDirtyGuardService]
      }
    ]
  },
  {
    path: 'objects/:bid',
    data: { subTitle: '{{ bid }}', title: TEXT('Bucket:'), url: '../../buckets' },
    children: [
      {
        path: '',
        component: ObjectDatatablePageComponent
      },
      {
        path: 'versions/:prefix',
        data: {
          subTitle: '{{ bid }}/{{ prefix | decodeUriComponent }} - Versions',
          title: TEXT('Object:'),
          url: '../..'
        },
        component: ObjectVersionDatatablePageComponent
      }
    ]
  }
];

@NgModule({
  exports: [RouterModule],
  imports: [RouterModule.forChild(routes)]
})
export class UserPagesRoutingModule {}
