import { Component } from '@angular/core';
import { marker as TEXT } from '@ngneat/transloco-keys-manager/marker';

import { NavigationItem } from '~/app/shared/components/navigation-bar/navigation-bar-item/navigation-bar-item.component';
import { Icon } from '~/app/shared/enum/icon.enum';

@Component({
  selector: 's3gw-admin-layout',
  templateUrl: './admin-layout.component.html',
  styleUrls: ['./admin-layout.component.scss']
})
export class AdminLayoutComponent {
  public navigationItems: NavigationItem[] = [
    {
      name: TEXT('Dashboard'),
      icon: Icon.apps,
      route: '/admin/dashboard'
    },
    {
      name: TEXT('Users'),
      icon: Icon.users,
      route: '/admin/users'
    },
    {
      name: TEXT('Buckets'),
      icon: Icon.bucket,
      route: '/admin/buckets'
    }
  ];
}
