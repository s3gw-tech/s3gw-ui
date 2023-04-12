import { Component, Input, OnInit } from '@angular/core';
import { Router } from '@angular/router';

import { Icon } from '~/app/shared/enum/icon.enum';
import { NavigationItem } from '~/app/shared/models/navigation-item.type';

@Component({
  selector: 's3gw-navigation-bar-item',
  templateUrl: './navigation-bar-item.component.html',
  styleUrls: ['./navigation-bar-item.component.scss']
})
export class NavigationBarItemComponent implements OnInit {
  @Input()
  item!: NavigationItem;

  @Input()
  depth = 0;

  public icons = Icon;

  constructor(private router: Router) {}

  ngOnInit(): void {}

  itemClicked(item: NavigationItem) {
    if (!item.children || !item.children.length) {
      this.router.navigate([item.url]);
    } else if (item.children && item.children.length) {
      item.expanded = !item.expanded;
    }
  }
}
