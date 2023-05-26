import { Pipe, PipeTransform } from '@angular/core';

import { format } from '~/app/functions.helper';

@Pipe({
  name: 'truncate'
})
export class TruncatePipe implements PipeTransform {
  transform(value: string, length: number = 255): unknown {
    return format(`{{ value | truncate(${length}, true) }}`, { value });
  }
}
