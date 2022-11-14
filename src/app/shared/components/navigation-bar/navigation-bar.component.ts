import { Component, Input } from '@angular/core';

import { NavigationItem } from '~/app/shared/models/navigation-item.type';

@Component({
  selector: 's3gw-navigation-bar',
  templateUrl: './navigation-bar.component.html',
  styleUrls: ['./navigation-bar.component.scss']
})
export class NavigationBarComponent {
  @Input()
  items: NavigationItem[] = [];
}
