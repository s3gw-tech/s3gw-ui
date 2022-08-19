import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { ArrayPipe } from '~/app/shared/pipes/array.pipe';
import { LocaleDatePipe } from '~/app/shared/pipes/locale-date.pipe';
import { MapPipe } from '~/app/shared/pipes/map.pipe';
import { SanitizePipe } from '~/app/shared/pipes/sanitize.pipe';
import { ToStringPipe } from '~/app/shared/pipes/to-string.pipe';

@NgModule({
  declarations: [ArrayPipe, LocaleDatePipe, MapPipe, SanitizePipe, ToStringPipe],
  providers: [ArrayPipe, LocaleDatePipe, MapPipe, SanitizePipe, ToStringPipe],
  exports: [ArrayPipe, LocaleDatePipe, MapPipe, SanitizePipe, ToStringPipe],
  imports: [CommonModule]
})
export class PipesModule {}
