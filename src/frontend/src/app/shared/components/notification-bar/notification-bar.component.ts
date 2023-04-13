import { Component, OnInit } from '@angular/core';
import * as _ from 'lodash';
import { Subscription } from 'rxjs';

import { Unsubscribe } from '~/app/functions.helper';
import { Icon } from '~/app/shared/enum/icon.enum';
import { Notification, NotificationService } from '~/app/shared/services/notification.service';

@Component({
  selector: 's3gw-notification-bar',
  templateUrl: './notification-bar.component.html',
  styleUrls: ['./notification-bar.component.scss']
})
export class NotificationBarComponent implements OnInit {
  @Unsubscribe()
  private subscriptions: Subscription = new Subscription();

  public notifications: Notification[] = [];
  public icons = Icon;

  constructor(private notificationService: NotificationService) {}

  ngOnInit(): void {
    this.subscriptions.add(
      this.notificationService.notifications$.subscribe((notifications: Notification[]) => {
        this.notifications = _.reverse(_.clone(notifications));
      })
    );
  }

  onDismissAll(): void {
    this.notificationService.removeAll();
  }
}
