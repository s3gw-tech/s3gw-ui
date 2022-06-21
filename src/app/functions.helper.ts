import * as _ from 'lodash';

/**
 * Convert a binary value into bytes.
 *
 * @param value The value to convert, e.g. '1024', '512MiB' or '2 G'.
 * @returns Returns the value in bytes or NULL in case of an error.
 */
export const toBytes = (value: number | string): number | null => {
  const base = 1024;
  const units = ['b', 'k', 'm', 'g', 't', 'p', 'e', 'z', 'y'];
  const m = RegExp('^(\\d+(.\\d+)?) ?([' + units.join('') + ']?(b|ib|B/s)?)?$', 'i').exec(
    String(value)
  );
  if (_.isNull(m)) {
    return null;
  }
  let bytes = parseFloat(m[1]);
  if (_.isString(m[3])) {
    bytes = bytes * Math.pow(base, units.indexOf(m[3].toLowerCase()[0]));
  }
  return Math.round(bytes);
};

/**
 * Convert a number of bytes into the highest possible binary unit.
 *
 * @param value The value to convert.
 * @returns Returns The converted value, e.g. '4 MiB'.
 */
export const bytesToSize = (value: null | number | string): string => {
  if (_.isNull(value) || [0, '0', ''].includes(value)) {
    return '0 B';
  }
  const bytes = _.toNumber(value);
  const sizes = ['B', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB'];
  const factor = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(factor));
  const rawVal = bytes / Math.pow(factor, i);
  const rounded = Math.round((rawVal + Number.EPSILON) * 100) / 100;
  return rounded + ' ' + sizes[i];
};
