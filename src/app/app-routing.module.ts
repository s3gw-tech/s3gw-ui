import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { marker as TEXT } from '@ngneat/transloco-keys-manager/marker';

import { DashboardPageComponent } from '~/app/pages/dashboard-page/dashboard-page.component';
import { LoginPageComponent } from '~/app/pages/login-page/login-page.component';
import { NotFoundPageComponent } from '~/app/pages/not-found-page/not-found-page.component';
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
        data: { breadcrumb: TEXT('Dashboard') },
        canActivate: [AuthGuardService],
        canActivateChild: [AuthGuardService],
        component: DashboardPageComponent
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
