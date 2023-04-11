import { Component, OnDestroy, OnInit } from '@angular/core';
import * as _ from 'lodash';
import { Subscription } from 'rxjs';

import { Icon } from '~/app/shared/enum/icon.enum';
import { Notification, NotificationService } from '~/app/shared/services/notification.service';
@Component({
  selector: 's3gw-notification-bar',
  templateUrl: './notification-bar.component.html',
  styleUrls: ['./notification-bar.component.scss']
})
export class NotificationBarComponent implements OnInit, OnDestroy {
  public notifications: Notification[] = [];
  public icons = Icon;

  private subscriptions: Subscription = new Subscription();

  constructor(private notificationService: NotificationService) {}

  ngOnInit(): void {
    this.subscriptions.add(
      this.notificationService.notifications$.subscribe((notifications: Notification[]) => {
        this.notifications = _.reverse(_.clone(notifications));
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  onDismissAll(): void {
    this.notificationService.removeAll();
  }
}
