import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { TranslocoModule } from '@ngneat/transloco';
import { BlockUIModule } from 'ng-block-ui';

import { AlertPanelComponent } from '~/app/shared/components/alert-panel/alert-panel.component';
import { BreadcrumbsComponent } from '~/app/shared/components/breadcrumbs/breadcrumbs.component';
import { DashboardWidgetComponent } from '~/app/shared/components/dashboard-widget/dashboard-widget.component';
import { DatatableComponent } from '~/app/shared/components/datatable/datatable.component';
import { DatatableActionsComponent } from '~/app/shared/components/datatable-actions/datatable-actions.component';
import { DeclarativeFormComponent } from '~/app/shared/components/declarative-form/declarative-form.component';
import { DeclarativeFormModalComponent } from '~/app/shared/components/declarative-form-modal/declarative-form-modal.component';
import { LanguageButtonComponent } from '~/app/shared/components/language-button/language-button.component';
import { ModalComponent } from '~/app/shared/components/modal/modal.component';
import { NavigationBarComponent } from '~/app/shared/components/navigation-bar/navigation-bar.component';
import { NavigationBarItemComponent } from '~/app/shared/components/navigation-bar/navigation-bar-item/navigation-bar-item.component';
import { PageActionsComponent } from '~/app/shared/components/page-actions/page-actions.component';
import { PageTitleComponent } from '~/app/shared/components/page-title/page-title.component';
import { PageWrapperComponent } from '~/app/shared/components/page-wrapper/page-wrapper.component';
import { SubmitButtonComponent } from '~/app/shared/components/submit-button/submit-button.component';
import { TagsInputComponent } from '~/app/shared/components/tags-input/tags-input.component';
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
    ModalComponent,
    LanguageButtonComponent,
    NavigationBarComponent,
    NavigationBarItemComponent,
    PageWrapperComponent,
    SubmitButtonComponent,
    TopBarComponent,
    DashboardWidgetComponent,
    PageTitleComponent,
    DatatableActionsComponent,
    PageActionsComponent,
    TagsInputComponent
  ],
  exports: [
    AlertPanelComponent,
    BreadcrumbsComponent,
    DatatableComponent,
    DeclarativeFormComponent,
    DeclarativeFormModalComponent,
    ModalComponent,
    LanguageButtonComponent,
    NavigationBarComponent,
    PageWrapperComponent,
    SubmitButtonComponent,
    TopBarComponent,
    DashboardWidgetComponent,
    PageTitleComponent,
    DatatableActionsComponent,
    PageActionsComponent,
    TagsInputComponent
  ],
  imports: [
    BlockUIModule,
    CommonModule,
    DirectivesModule,
    FormsModule,
    NgbModule,
    PipesModule,
    ReactiveFormsModule,
    RouterModule,
    TranslocoModule
  ]
})
export class ComponentsModule {}
