import { Pipe, PipeTransform } from '@angular/core';

import { format } from '~/app/functions.helper';

@Pipe({
  name: 'format'
})
export class FormatPipe implements PipeTransform {
  transform(value: string, options?: Record<any, any>): string {
    return format(value, options ?? {});
  }
}
