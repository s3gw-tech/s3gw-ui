import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { LoginPageComponent } from '~/app/pages/shared/login-page/login-page.component';
import { NotFoundPageComponent } from '~/app/pages/shared/not-found-page/not-found-page.component';
import { AdminLayoutComponent } from '~/app/shared/layouts/admin-layout/admin-layout.component';
import { BlankLayoutComponent } from '~/app/shared/layouts/blank-layout/blank-layout.component';
import { UserLayoutComponent } from '~/app/shared/layouts/user-layout/user-layout.component';
import { AuthGuardService } from '~/app/shared/services/auth-guard.service';

const routes: Routes = [
  { path: '', redirectTo: 'admin/dashboard', pathMatch: 'full' },
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
    component: AdminLayoutComponent,
    canActivate: [AuthGuardService],
    canActivateChild: [AuthGuardService],
    loadChildren: () => import('./pages/admin/admin-pages.module').then((m) => m.AdminPagesModule)
  },
  {
    path: 'user',
    component: UserLayoutComponent,
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
