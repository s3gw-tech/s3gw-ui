import { Pipe, PipeTransform } from '@angular/core';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import * as _ from 'lodash';

dayjs.extend(relativeTime);

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
   * @param format The format to use, e.g. 'date', 'time' or 'datetime'.
   *   Defaults to 'date'.
   * @return The time in the given format or an empty string on failure.
   */
  transform(
    value: Date | string | number,
    format?: 'date' | 'time' | 'datetime' | 'relative',
    options?: any
  ): any {
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
    return this.toLocaleString(date.toDate(), format, options);
  }

  toLocaleString(
    date: Date,
    format?: 'date' | 'time' | 'datetime' | 'relative',
    options?: any
  ): string {
    let result;
    switch (format) {
      case 'relative':
        result = dayjs(date).fromNow(options);
        break;
      case 'datetime':
        result = date.toLocaleString();
        break;
      case 'time':
        result = date.toLocaleTimeString();
        break;
      case 'date':
      default:
        result = date.toLocaleDateString();
        break;
    }
    return result;
  }
}
