import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { TranslocoModule } from '@ngneat/transloco';
import { BlockUIModule } from 'ng-block-ui';

import { ComponentsModule } from '~/app/shared/components/components.module';
import { DirectivesModule } from '~/app/shared/directives/directives.module';
import { AdminLayoutComponent } from '~/app/shared/layouts/admin-layout/admin-layout.component';
import { BlankLayoutComponent } from '~/app/shared/layouts/blank-layout/blank-layout.component';
import { MainLayoutComponent } from '~/app/shared/layouts/main-layout/main-layout.component';
import { UserLayoutComponent } from '~/app/shared/layouts/user-layout/user-layout.component';
import { PipesModule } from '~/app/shared/pipes/pipes.module';

@NgModule({
  declarations: [
    AdminLayoutComponent,
    BlankLayoutComponent,
    UserLayoutComponent,
    MainLayoutComponent
  ],
  imports: [
    BlockUIModule.forRoot(),
    CommonModule,
    ComponentsModule,
    DirectivesModule,
    PipesModule,
    RouterModule,
    TranslocoModule
  ],
  exports: [
    AdminLayoutComponent,
    BlankLayoutComponent,
    ComponentsModule,
    DirectivesModule,
    PipesModule
  ]
})
export class SharedModule {}
