import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { AutofocusDirective } from '~/app/shared/directives/autofocus.directive';
import { DatatableExpandedRowTemplateDirective } from '~/app/shared/directives/datatable-expanded-row-template.directive';
import { DimlessBinaryDirective } from '~/app/shared/directives/dimless-binary.directive';
import { ForTimesDirective } from '~/app/shared/directives/for-times.directive';
import { NativeElementDirective } from '~/app/shared/directives/native-element.directive';

@NgModule({
  declarations: [
    AutofocusDirective,
    DimlessBinaryDirective,
    NativeElementDirective,
    DatatableExpandedRowTemplateDirective,
    ForTimesDirective
  ],
  exports: [
    AutofocusDirective,
    DimlessBinaryDirective,
    NativeElementDirective,
    DatatableExpandedRowTemplateDirective,
    ForTimesDirective
  ],
  imports: [CommonModule]
})
export class DirectivesModule {}
