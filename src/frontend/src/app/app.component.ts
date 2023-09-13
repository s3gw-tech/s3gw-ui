import { Component } from '@angular/core';
import { Title } from '@angular/platform-browser';

import { AppConfigService } from '~/app/shared/services/app-config.service';

@Component({
  selector: 's3gw-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  constructor(private appConfigService: AppConfigService, private title: Title) {
    if (appConfigService.config?.title) {
      this.title.setTitle(appConfigService.config.title);
    }
  }
}
