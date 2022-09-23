import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { marker as TEXT } from '@ngneat/transloco-keys-manager/marker';

import { BucketDatatablePageComponent } from '~/app/pages/bucket/bucket-datatable-page/bucket-datatable-page.component';
import { BucketFormPageComponent } from '~/app/pages/bucket/bucket-form-page/bucket-form-page.component';
import { DashboardPageComponent } from '~/app/pages/dashboard-page/dashboard-page.component';
import { LoginPageComponent } from '~/app/pages/login-page/login-page.component';
import { NotFoundPageComponent } from '~/app/pages/not-found-page/not-found-page.component';
import { UserDatatablePageComponent } from '~/app/pages/user/user-datatable-page/user-datatable-page.component';
import { UserFormPageComponent } from '~/app/pages/user/user-form-page/user-form-page.component';
import { UserKeyDatatablePageComponent } from '~/app/pages/user/user-key-datatable-page/user-key-datatable-page.component';
import { UserKeyFormPageComponent } from '~/app/pages/user/user-key-form-page/user-key-form-page.component';
import { BlankLayoutComponent } from '~/app/shared/layouts/blank-layout/blank-layout.component';
import { MainLayoutComponent } from '~/app/shared/layouts/main-layout/main-layout.component';
import { AuthGuardService } from '~/app/shared/services/auth-guard.service';

const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  {
    path: '',
    component: MainLayoutComponent,
    children: [
      {
        path: 'dashboard',
        data: { breadcrumb: TEXT('Dashboard'), title: TEXT('Dashboard') },
        canActivate: [AuthGuardService],
        canActivateChild: [AuthGuardService],
        component: DashboardPageComponent
      },
      {
        path: 'buckets',
        data: { breadcrumb: TEXT('Buckets'), title: TEXT('Buckets') },
        canActivate: [AuthGuardService],
        canActivateChild: [AuthGuardService],
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
      },
      {
        path: 'users',
        data: { breadcrumb: TEXT('Users'), title: TEXT('Users') },
        canActivate: [AuthGuardService],
        canActivateChild: [AuthGuardService],
        children: [
          {
            path: '',
            component: UserDatatablePageComponent
          },
          {
            path: 'create',
            data: { breadcrumb: TEXT('Create'), title: TEXT('Create User') },
            component: UserFormPageComponent
          },
          {
            path: 'edit/:uid',
            data: { breadcrumb: TEXT('Edit'), title: TEXT('Edit User') },
            component: UserFormPageComponent
          },
          {
            path: ':uid/key',
            data: { breadcrumb: TEXT('Keys'), title: TEXT('Keys') },
            children: [
              {
                path: '',
                component: UserKeyDatatablePageComponent
              },
              {
                path: 'create',
                data: { breadcrumb: TEXT('Create'), title: TEXT('Create Key') },
                component: UserKeyFormPageComponent
              }
            ]
          }
        ]
      }
    ]
  },
  {
    path: '',
    component: BlankLayoutComponent,
    children: [
      { path: 'login', component: LoginPageComponent },
      {
        path: '404',
        component: NotFoundPageComponent
      }
    ]
  },
  { path: '**', redirectTo: '/404' }
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, {
      useHash: true
    })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule {}
