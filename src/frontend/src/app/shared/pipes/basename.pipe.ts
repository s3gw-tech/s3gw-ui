import { Pipe, PipeTransform } from '@angular/core';

import { basename } from '~/app/functions.helper';
import { AppMainConfigService } from '~/app/shared/services/app-main-config.service';

@Pipe({
  name: 'basename'
})
export class BasenamePipe implements PipeTransform {
  constructor(private appMainConfigService: AppMainConfigService) {}

  transform(value: string, delimiter: string = '/'): string | unknown {
    return basename(value, this.appMainConfigService.config.Delimiter);
  }
}
