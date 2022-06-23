import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FlexLayoutModule } from '@angular/flex-layout';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { TranslocoModule } from '@ngneat/transloco';

import { AlertPanelComponent } from '~/app/shared/components/alert-panel/alert-panel.component';
import { BreadcrumbsComponent } from '~/app/shared/components/breadcrumbs/breadcrumbs.component';
import { DeclarativeFormComponent } from '~/app/shared/components/declarative-form/declarative-form.component';
import { DialogComponent } from '~/app/shared/components/dialog/dialog.component';
import { LanguageButtonComponent } from '~/app/shared/components/language-button/language-button.component';
import { NavigationBarComponent } from '~/app/shared/components/navigation-bar/navigation-bar.component';
import { NavigationBarItemComponent } from '~/app/shared/components/navigation-bar/navigation-bar-item/navigation-bar-item.component';
import { SubmitButtonComponent } from '~/app/shared/components/submit-button/submit-button.component';
import { TopBarComponent } from '~/app/shared/components/top-bar/top-bar.component';
import { DirectivesModule } from '~/app/shared/directives/directives.module';
import { PipesModule } from '~/app/shared/pipes/pipes.module';

@NgModule({
  declarations: [
    AlertPanelComponent,
    BreadcrumbsComponent,
    DeclarativeFormComponent,
    DialogComponent,
    LanguageButtonComponent,
    NavigationBarComponent,
    NavigationBarItemComponent,
    SubmitButtonComponent,
    TopBarComponent
  ],
  exports: [
    AlertPanelComponent,
    BreadcrumbsComponent,
    DeclarativeFormComponent,
    DialogComponent,
    LanguageButtonComponent,
    NavigationBarComponent,
    SubmitButtonComponent,
    TopBarComponent
  ],
  imports: [
    CommonModule,
    DirectivesModule,
    FlexLayoutModule,
    FormsModule,
    NgbModule,
    PipesModule,
    ReactiveFormsModule,
    RouterModule,
    TranslocoModule
  ]
})
export class ComponentsModule {}
