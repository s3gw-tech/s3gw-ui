import { Pipe, PipeTransform, SecurityContext } from '@angular/core';
import { DomSanitizer, SafeValue } from '@angular/platform-browser';

@Pipe({
  name: 'sanitize'
})
export class SanitizePipe implements PipeTransform {
  constructor(private domSanitizer: DomSanitizer) {}

  transform(value: SafeValue | string | null, type?: 'html'): string | null {
    let context: SecurityContext = SecurityContext.NONE;
    switch (type) {
      case 'html':
        context = SecurityContext.HTML;
        break;
    }
    return this.domSanitizer.sanitize(context, value);
  }
}
