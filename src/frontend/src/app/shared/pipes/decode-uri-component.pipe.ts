import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'decodeUriComponent'
})
export class DecodeUriComponentPipe implements PipeTransform {
  transform(value: string): string {
    return decodeURIComponent(value);
  }
}
