import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { ArrayPipe } from '~/app/shared/pipes/array.pipe';
import { MapPipe } from '~/app/shared/pipes/map.pipe';
import { SanitizePipe } from '~/app/shared/pipes/sanitize.pipe';
import { ToStringPipe } from '~/app/shared/pipes/to-string.pipe';

@NgModule({
  declarations: [ArrayPipe, MapPipe, SanitizePipe, ToStringPipe],
  providers: [ArrayPipe, MapPipe, SanitizePipe, ToStringPipe],
  exports: [ArrayPipe, MapPipe, SanitizePipe, ToStringPipe],
  imports: [CommonModule]
})
export class PipesModule {}
