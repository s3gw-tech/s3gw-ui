import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { ArrayPipe } from '~/app/shared/pipes/array.pipe';
import { BasenamePipe } from '~/app/shared/pipes/basename.pipe';
import { BytesToSizePipe } from '~/app/shared/pipes/bytes-to-size.pipe';
import { DecodeUriComponentPipe } from '~/app/shared/pipes/decode-uri-component.pipe';
import { FormatPipe } from '~/app/shared/pipes/format.pipe';
import { LocaleDatePipe } from '~/app/shared/pipes/locale-date.pipe';
import { MapPipe } from '~/app/shared/pipes/map.pipe';
import { MaskPipe } from '~/app/shared/pipes/mask.pipe';
import { NotAvailablePipe } from '~/app/shared/pipes/not-available.pipe';
import { SanitizePipe } from '~/app/shared/pipes/sanitize.pipe';
import { ToStringPipe } from '~/app/shared/pipes/to-string.pipe';
import { TruncatePipe } from '~/app/shared/pipes/truncate.pipe';

@NgModule({
  declarations: [
    ArrayPipe,
    BytesToSizePipe,
    FormatPipe,
    LocaleDatePipe,
    MapPipe,
    SanitizePipe,
    ToStringPipe,
    NotAvailablePipe,
    MaskPipe,
    BasenamePipe,
    DecodeUriComponentPipe,
    TruncatePipe
  ],
  providers: [
    ArrayPipe,
    BytesToSizePipe,
    FormatPipe,
    LocaleDatePipe,
    MapPipe,
    SanitizePipe,
    ToStringPipe,
    NotAvailablePipe,
    MaskPipe,
    BasenamePipe,
    DecodeUriComponentPipe,
    TruncatePipe
  ],
  exports: [
    ArrayPipe,
    BytesToSizePipe,
    FormatPipe,
    LocaleDatePipe,
    MapPipe,
    SanitizePipe,
    ToStringPipe,
    NotAvailablePipe,
    MaskPipe,
    BasenamePipe,
    DecodeUriComponentPipe,
    TruncatePipe
  ],
  imports: [CommonModule]
})
export class PipesModule {}
