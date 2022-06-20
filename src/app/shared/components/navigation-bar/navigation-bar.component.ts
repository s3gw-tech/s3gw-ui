import { Component } from '@angular/core';
import { marker as TEXT } from '@ngneat/transloco-keys-manager/marker';

import { NavItem } from '~/app/shared/components/navigation-bar/navigation-bar-item/navigation-bar-item.component';

@Component({
  selector: 's3gw-navigation-bar',
  templateUrl: './navigation-bar.component.html',
  styleUrls: ['./navigation-bar.component.scss']
})
export class NavigationBarComponent {
  navItems: NavItem[] = [
    {
      name: TEXT('Dashboard'),
      icon: 'mdi mdi-apps',
      route: '/dashboard'
    },
    {
      name: TEXT('Users'),
      icon: 'mdi mdi-account-multiple',
      route: '/users'
    }
  ];

  constructor() {}
}
