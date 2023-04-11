import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { LoginPageComponent } from '~/app/pages/shared/login-page/login-page.component';
import { NotFoundPageComponent } from '~/app/pages/shared/not-found-page/not-found-page.component';
import { BlankLayoutComponent } from '~/app/shared/layouts/blank-layout/blank-layout.component';
import { MainLayoutComponent } from '~/app/shared/layouts/main-layout/main-layout.component';
import { AdminGuardService } from '~/app/shared/services/admin-guard.service';
import { AuthGuardService } from '~/app/shared/services/auth-guard.service';

const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
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
  {
    path: 'admin',
    component: MainLayoutComponent,
    canActivate: [AuthGuardService, AdminGuardService],
    canActivateChild: [AuthGuardService, AdminGuardService],
    loadChildren: () => import('./pages/admin/admin-pages.module').then((m) => m.AdminPagesModule)
  },
  {
    path: '',
    component: MainLayoutComponent,
    canActivate: [AuthGuardService],
    canActivateChild: [AuthGuardService],
    loadChildren: () => import('./pages/user/user-pages.module').then((m) => m.UserPagesModule)
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
