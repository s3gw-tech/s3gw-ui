import { Component } from '@angular/core';
import { marker as TEXT } from '@ngneat/transloco-keys-manager/marker';

import { NavItem } from '~/app/shared/components/navigation-bar/navigation-bar-item/navigation-bar-item.component';
import { Icon } from '~/app/shared/enum/icon.enum';

@Component({
  selector: 's3gw-navigation-bar',
  templateUrl: './navigation-bar.component.html',
  styleUrls: ['./navigation-bar.component.scss']
})
export class NavigationBarComponent {
  navItems: NavItem[] = [
    {
      name: TEXT('Dashboard'),
      icon: Icon.apps,
      route: '/dashboard'
    },
    {
      name: TEXT('Users'),
      icon: Icon.users,
      route: '/users'
    },
    {
      name: TEXT('Buckets'),
      icon: Icon.bucket,
      route: '/buckets'
    }
  ];
}
