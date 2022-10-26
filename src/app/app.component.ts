import { Component } from '@angular/core';

import { RgwServiceConfigService } from '~/app/shared/services/rgw-service-config.service';

@Component({
  selector: 's3gw-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  public title = 's3gw';
  public isRgwServiceConfigValid: boolean;

  constructor(private rgwServiceConfigService: RgwServiceConfigService) {
    this.isRgwServiceConfigValid = rgwServiceConfigService.isValid();
  }
}
