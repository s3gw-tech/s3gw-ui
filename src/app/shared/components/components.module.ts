import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FlexLayoutModule } from '@angular/flex-layout';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { TranslocoModule } from '@ngneat/transloco';

import { BreadcrumbsComponent } from '~/app/shared/components/breadcrumbs/breadcrumbs.component';
import { DialogComponent } from '~/app/shared/components/dialog/dialog.component';
import { NavigationBarComponent } from '~/app/shared/components/navigation-bar/navigation-bar.component';
import { NavigationBarItemComponent } from '~/app/shared/components/navigation-bar/navigation-bar-item/navigation-bar-item.component';
import { TopBarComponent } from '~/app/shared/components/top-bar/top-bar.component';

@NgModule({
  declarations: [
    BreadcrumbsComponent,
    DialogComponent,
    NavigationBarComponent,
    NavigationBarItemComponent,
    TopBarComponent
  ],
  exports: [BreadcrumbsComponent, DialogComponent, NavigationBarComponent, TopBarComponent],
  imports: [
    CommonModule,
    FlexLayoutModule,
    FormsModule,
    NgbModule,
    ReactiveFormsModule,
    RouterModule,
    TranslocoModule
  ]
})
export class ComponentsModule {}
