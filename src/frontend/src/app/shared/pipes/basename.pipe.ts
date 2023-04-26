import { Pipe, PipeTransform } from '@angular/core';

import { basename } from '~/app/functions.helper';
import { S3gwConfigService } from '~/app/shared/services/s3gw-config.service';

@Pipe({
  name: 'basename'
})
export class BasenamePipe implements PipeTransform {
  constructor(private s3gwConfigService: S3gwConfigService) {}

  transform(value: string, delimiter: string = '/'): string | unknown {
    return basename(value, this.s3gwConfigService.config.delimiter);
  }
}
