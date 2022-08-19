import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { AutofocusDirective } from '~/app/shared/directives/autofocus.directive';
import { DimlessBinaryDirective } from '~/app/shared/directives/dimless-binary.directive';
import { NativeElementDirective } from '~/app/shared/directives/native-element.directive';

@NgModule({
  declarations: [AutofocusDirective, DimlessBinaryDirective, NativeElementDirective],
  exports: [AutofocusDirective, DimlessBinaryDirective, NativeElementDirective],
  imports: [CommonModule]
})
export class DirectivesModule {}
