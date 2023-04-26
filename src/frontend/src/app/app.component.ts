import { Component } from '@angular/core';
import { Title } from '@angular/platform-browser';

import { AppConfigService } from '~/app/shared/services/app-config.service';
import { S3gwConfigService } from '~/app/shared/services/s3gw-config.service';

@Component({
  selector: 's3gw-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  public isS3gwConfigValid: boolean;

  constructor(
    private appConfigService: AppConfigService,
    private s3gwConfigService: S3gwConfigService,
    private title: Title
  ) {
    this.isS3gwConfigValid = s3gwConfigService.isValid();
    if (appConfigService.config?.title) {
      this.title.setTitle(appConfigService.config.title);
    }
  }
}
