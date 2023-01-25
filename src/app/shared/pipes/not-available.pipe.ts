import { Pipe, PipeTransform } from '@angular/core';
import { marker as TEXT } from '@ngneat/transloco-keys-manager/marker';
import * as _ from 'lodash';

import { translate } from '~/app/i18n.helper';

@Pipe({
  name: 'notAvailable'
})
export class NotAvailablePipe implements PipeTransform {
  transform(value: unknown, defaultValue?: string): any {
    return _.isUndefined(value) || _.isNull(value) || _.isNaN(value) || '' === value
      ? _.defaultTo(defaultValue, translate(TEXT('n/a')))
      : value;
  }
}
