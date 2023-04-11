import { Pipe, PipeTransform } from '@angular/core';
import * as _ from 'lodash';

import { bytesToSize } from '~/app/functions.helper';

@Pipe({
  name: 'bytesToSize'
})
export class BytesToSizePipe implements PipeTransform {
  transform(value: undefined | null | number | string): undefined | null | string {
    if (_.isUndefined(value) || _.isNull(value) || '' === value) {
      return value;
    }
    return bytesToSize(value);
  }
}
