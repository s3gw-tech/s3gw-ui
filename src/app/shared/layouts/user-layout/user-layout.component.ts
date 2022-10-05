import { Component } from '@angular/core';
import { marker as TEXT } from '@ngneat/transloco-keys-manager/marker';

import { NavigationItem } from '~/app/shared/components/navigation-bar/navigation-bar-item/navigation-bar-item.component';
import { Icon } from '~/app/shared/enum/icon.enum';

@Component({
  selector: 's3gw-user-layout',
  templateUrl: './user-layout.component.html',
  styleUrls: ['./user-layout.component.scss']
})
export class UserLayoutComponent {
  public navigationItems: NavigationItem[] = [
    {
      name: TEXT('Dashboard'),
      icon: Icon.apps,
      route: '/user/dashboard'
    },
    {
      name: TEXT('Buckets'),
      icon: Icon.bucket,
      route: '/user/buckets'
    }
  ];
}
