import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { TranslocoModule } from '@ngneat/transloco';
import { BlockUIModule } from 'ng-block-ui';

import { ComponentsModule } from '~/app/shared/components/components.module';
import { DirectivesModule } from '~/app/shared/directives/directives.module';
import { BlankLayoutComponent } from '~/app/shared/layouts/blank-layout/blank-layout.component';
import { MainLayoutComponent } from '~/app/shared/layouts/main-layout/main-layout.component';
import { PipesModule } from '~/app/shared/pipes/pipes.module';

@NgModule({
  declarations: [BlankLayoutComponent, MainLayoutComponent],
  imports: [
    BlockUIModule.forRoot(),
    CommonModule,
    ComponentsModule,
    DirectivesModule,
    PipesModule,
    RouterModule,
    TranslocoModule
  ],
  exports: [ComponentsModule, DirectivesModule, PipesModule]
})
export class SharedModule {}
