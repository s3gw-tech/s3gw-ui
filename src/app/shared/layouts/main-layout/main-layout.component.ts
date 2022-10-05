import { Component, Input } from '@angular/core';

import { NavigationItem } from '~/app/shared/components/navigation-bar/navigation-bar-item/navigation-bar-item.component';

@Component({
  selector: 's3gw-main-layout',
  templateUrl: './main-layout.component.html',
  styleUrls: ['./main-layout.component.scss']
})
export class MainLayoutComponent {
  @Input()
  navigationItems: NavigationItem[] = [];

  public navigationCollapsed = false;
}
