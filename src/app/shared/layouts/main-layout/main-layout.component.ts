import { Component, ElementRef, HostListener, OnDestroy, ViewChild } from '@angular/core';
import { Subscription } from 'rxjs';

import { NotificationBarComponent } from '~/app/shared/components/notification-bar/notification-bar.component';
import { NavigationConfig } from '~/app/shared/models/navigation-config.type';
import { NavigationItem } from '~/app/shared/models/navigation-item.type';
import { NavigationConfigService } from '~/app/shared/services/navigation-config.service';

@Component({
  selector: 's3gw-main-layout',
  templateUrl: './main-layout.component.html',
  styleUrls: ['./main-layout.component.scss']
})
export class MainLayoutComponent implements OnDestroy {
  @ViewChild(NotificationBarComponent, { read: ElementRef })
  notificationBar?: ElementRef;

  public navigationItems: NavigationItem[] = [];
  public navigationCollapsed = false;
  public notificationsCollapsed = true;

  private subscription: Subscription;

  constructor(private navigationConfigService: NavigationConfigService) {
    this.subscription = navigationConfigService.config$.subscribe(
      (config: NavigationConfig) => (this.navigationItems = config.items)
    );
  }

  @HostListener('click', ['$event'])
  onClick(event: Event): void {
    // Close the notification bar.
    if (
      !this.notificationsCollapsed &&
      !this.notificationBar?.nativeElement.contains(event.target)
    ) {
      this.notificationsCollapsed = true;
    }
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }
}
