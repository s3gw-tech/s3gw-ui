import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FlexLayoutModule } from '@angular/flex-layout';
import { RouterModule } from '@angular/router';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { TranslocoModule } from '@ngneat/transloco';

import { DashboardPageComponent } from '~/app/pages/dashboard-page/dashboard-page.component';
import { LoginPageComponent } from '~/app/pages/login-page/login-page.component';
import { NotFoundPageComponent } from '~/app/pages/not-found-page/not-found-page.component';
import { SharedModule } from '~/app/shared/shared.module';

@NgModule({
  declarations: [DashboardPageComponent, LoginPageComponent, NotFoundPageComponent],
  imports: [CommonModule, FlexLayoutModule, NgbModule, RouterModule, SharedModule, TranslocoModule]
})
export class PagesModule {}
