import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { ArrayPipe } from '~/app/shared/pipes/array.pipe';
import { BytesToSizePipe } from '~/app/shared/pipes/bytes-to-size.pipe';
import { FormatPipe } from '~/app/shared/pipes/format.pipe';
import { LocaleDatePipe } from '~/app/shared/pipes/locale-date.pipe';
import { MapPipe } from '~/app/shared/pipes/map.pipe';
import { SanitizePipe } from '~/app/shared/pipes/sanitize.pipe';
import { ToStringPipe } from '~/app/shared/pipes/to-string.pipe';

@NgModule({
  declarations: [
    ArrayPipe,
    BytesToSizePipe,
    FormatPipe,
    LocaleDatePipe,
    MapPipe,
    SanitizePipe,
    ToStringPipe
  ],
  providers: [
    ArrayPipe,
    BytesToSizePipe,
    FormatPipe,
    LocaleDatePipe,
    MapPipe,
    SanitizePipe,
    ToStringPipe
  ],
  exports: [
    ArrayPipe,
    BytesToSizePipe,
    FormatPipe,
    LocaleDatePipe,
    MapPipe,
    SanitizePipe,
    ToStringPipe
  ],
  imports: [CommonModule]
})
export class PipesModule {}
