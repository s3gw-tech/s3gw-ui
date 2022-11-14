import { Component, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';

import { NavigationItem } from '~/app/shared/models/navigation-item.type';
import { NavigationConfigService } from '~/app/shared/services/navigation-config.service';

@Component({
  selector: 's3gw-main-layout',
  templateUrl: './main-layout.component.html',
  styleUrls: ['./main-layout.component.scss']
})
export class MainLayoutComponent implements OnDestroy {
  public navigationItems: NavigationItem[] = [];
  public navigationCollapsed = false;

  private subscription: Subscription;

  constructor(private navigationConfigService: NavigationConfigService) {
    this.subscription = navigationConfigService.items$.subscribe(
      (items) => (this.navigationItems = items)
    );
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }
}
