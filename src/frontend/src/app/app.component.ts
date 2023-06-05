import { Component } from '@angular/core';
import { Title } from '@angular/platform-browser';

import { AppConfigService } from '~/app/shared/services/app-config.service';
import { RgwServiceConfigService } from '~/app/shared/services/rgw-service-config.service';

@Component({
  selector: 's3gw-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  public isRgwServiceConfigValid: boolean;

  constructor(
    private appConfigService: AppConfigService,
    private rgwServiceConfigService: RgwServiceConfigService,
    private title: Title
  ) {
    this.isRgwServiceConfigValid = rgwServiceConfigService.isValid();
    if (appConfigService.config?.title) {
      this.title.setTitle(appConfigService.config.title);
    }
  }
}
