import { Pipe, PipeTransform } from '@angular/core';
import * as _ from 'lodash';

@Pipe({
  name: 'mask'
})
export class MaskPipe implements PipeTransform {
  /**
   * Mask the given value.
   *
   * @param value The value to mask.
   * @param ch The masking character.
   * @param randomize Use a random length instead the original length
   *   of the value. Defaults to `false`.
   * @param randomLower The lower bound. Defaults to `8`.
   * @param randomUpper The upper bound. Defaults to '24`.
   */
  transform(
    value: string | number | undefined,
    ch: string = '*',
    randomize = false,
    randomLower: number = 8,
    randomUpper: number = 24
  ): string {
    const n: number = randomize ? _.random(randomLower, randomUpper) : _.toString(value).length;
    return _.repeat(ch, n);
  }
}
