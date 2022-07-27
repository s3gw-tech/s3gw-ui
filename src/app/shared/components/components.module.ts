import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FlexLayoutModule } from '@angular/flex-layout';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { TranslocoModule } from '@ngneat/transloco';

import { AlertPanelComponent } from '~/app/shared/components/alert-panel/alert-panel.component';
import { BreadcrumbsComponent } from '~/app/shared/components/breadcrumbs/breadcrumbs.component';
import { DatatableComponent } from '~/app/shared/components/datatable/datatable.component';
import { DeclarativeFormComponent } from '~/app/shared/components/declarative-form/declarative-form.component';
import { DeclarativeFormModalComponent } from '~/app/shared/components/declarative-form-modal/declarative-form-modal.component';
import { LanguageButtonComponent } from '~/app/shared/components/language-button/language-button.component';
import { ModelComponent } from '~/app/shared/components/modal/model.component';
import { NavigationBarComponent } from '~/app/shared/components/navigation-bar/navigation-bar.component';
import { NavigationBarItemComponent } from '~/app/shared/components/navigation-bar/navigation-bar-item/navigation-bar-item.component';
import { PageStatusComponent } from '~/app/shared/components/page-status/page-status.component';
import { SubmitButtonComponent } from '~/app/shared/components/submit-button/submit-button.component';
import { TopBarComponent } from '~/app/shared/components/top-bar/top-bar.component';
import { DirectivesModule } from '~/app/shared/directives/directives.module';
import { PipesModule } from '~/app/shared/pipes/pipes.module';

@NgModule({
  declarations: [
    AlertPanelComponent,
    BreadcrumbsComponent,
    DatatableComponent,
    DeclarativeFormComponent,
    DeclarativeFormModalComponent,
    ModelComponent,
    LanguageButtonComponent,
    NavigationBarComponent,
    NavigationBarItemComponent,
    PageStatusComponent,
    SubmitButtonComponent,
    TopBarComponent
  ],
  exports: [
    AlertPanelComponent,
    BreadcrumbsComponent,
    DatatableComponent,
    DeclarativeFormComponent,
    DeclarativeFormModalComponent,
    ModelComponent,
    LanguageButtonComponent,
    NavigationBarComponent,
    PageStatusComponent,
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
