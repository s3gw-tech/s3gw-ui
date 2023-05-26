import { Pipe, PipeTransform } from '@angular/core';

import { basename } from '~/app/functions.helper';
import { RgwServiceConfigService } from '~/app/shared/services/rgw-service-config.service';

@Pipe({
  name: 'basename'
})
export class BasenamePipe implements PipeTransform {
  constructor(private rgwServiceConfigService: RgwServiceConfigService) {}

  transform(value: string, delimiter: string = '/'): string | unknown {
    return basename(value, this.rgwServiceConfigService.config.delimiter);
  }
}
