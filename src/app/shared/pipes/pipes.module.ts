import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { SanitizePipe } from '~/app/shared/pipes/sanitize.pipe';
import { ToStringPipe } from '~/app/shared/pipes/to-string.pipe';

@NgModule({
  declarations: [SanitizePipe, ToStringPipe],
  providers: [SanitizePipe, ToStringPipe],
  exports: [SanitizePipe, ToStringPipe],
  imports: [CommonModule]
})
export class PipesModule {}
