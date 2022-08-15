import { Pipe, PipeTransform } from '@angular/core';
import dayjs from 'dayjs';
import * as _ from 'lodash';

@Pipe({
  name: 'localeDate',
  pure: false
})
export class LocaleDatePipe implements PipeTransform {
  /**
   * Convert the specified date/time appropriate to the host/browser
   * environment's current locale.
   *
   * @param value The date/time value. If it is a number, a UNIX epoch
   *   timestamp is assumed.
   * @param dateFormat The format to use, e.g. 'date', 'time' or 'datetime'.
   *   Defaults to 'date'.
   * @return The time in the given format or an empty string on failure.
   */
  transform(value: Date | string | number, dateFormat?: string, options?: any): any {
    if (!(_.isString(value) || _.isDate(value) || _.isNumber(value))) {
      return '';
    }
    let date: dayjs.Dayjs;
    if (_.isNumber(value)) {
      date = dayjs.unix(value);
    } else {
      date = dayjs(value);
    }
    if (!date.isValid()) {
      return '';
    }
    let result;
    switch (dateFormat) {
      case 'datetime':
        result = date.toDate().toLocaleString();
        break;
      case 'time':
        result = date.toDate().toLocaleTimeString();
        break;
      case 'date':
      default:
        result = date.toDate().toLocaleDateString();
        break;
    }
    return result;
  }
}
