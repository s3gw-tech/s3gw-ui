import { Injectable } from '@angular/core';
import * as _ from 'lodash';
import { ToastrService } from 'ngx-toastr';
import { BehaviorSubject, Observable } from 'rxjs';

import { translate } from '~/app/i18n.helper';

// eslint-disable-next-line no-shadow
export enum NotificationType {
  info = 'info',
  error = 'error',
  success = 'success',
  warning = 'warning'
}

export type NotificationConfig = {
  type?: 'info' | 'error' | 'success' | 'warning';
  duration?: number;
};

export class Notification {
  private static nextId = 1;
  public readonly id: number;
  public readonly timestamp: string;

  constructor(
    public readonly type: NotificationType = NotificationType.info,
    public message?: string,
    public title?: string
  ) {
    this.id = Notification.nextId++;
    this.timestamp = new Date().toJSON();
  }
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  public readonly notifications$: Observable<Notification[]>;

  private notificationsSource = new BehaviorSubject<Notification[]>([]);

  constructor(private toastrService: ToastrService) {
    this.notifications$ = this.notificationsSource.asObservable();
  }

  /**
   * Shorthand to show an information notification.
   *
   * @param message The message to be displayed.
   * @param title The title to be displayed.
   * @returns The timeout ID that is set to be able to cancel the
   *   notification.
   */
  showInfo(message: string, title?: string): number {
    return this.show(message, title, {
      type: NotificationType.info
    });
  }

  /**
   * Shorthand to show an error notification.
   *
   * @param message The message to be displayed.
   * @param title The title to be displayed.
   * @returns The timeout ID that is set to be able to cancel the
   *   notification.
   */
  showError(message: string, title?: string): number {
    return this.show(message, title, {
      type: NotificationType.error
    });
  }

  /**
   * Shorthand to show a success notification.
   *
   * @param message The message to be displayed.
   * @param title The title to be displayed.
   * @returns The timeout ID that is set to be able to cancel the
   *   notification.
   */
  showSuccess(message: string, title?: string): number {
    return this.show(message, title, {
      type: NotificationType.success
    });
  }

  /**
   * Show a notification.
   *
   * @param message The message to be displayed.
   * @param title The title to be displayed.
   * @param config The notification configuration, including:
   *   type - 'info' or 'error'. Defaults to 'info'.
   *   duration - Defaults to 5000 milliseconds.
   * @returns The timeout ID that is set to be able to cancel the
   *   notification.
   */
  show(message: string, title?: string, config?: NotificationConfig): number {
    config = _.defaultsDeep(config || {}, { type: NotificationType.info, duration: 5000 });
    return window.setTimeout(() => {
      const notification: Notification = new Notification(
        config!.type as NotificationType,
        message,
        title
      );
      this.add(notification);
      this.toastrService[config!.type!](translate(message), title, {
        timeOut: config!.duration
      });
    }, 5);
  }

  /**
   * Cancel a notification.
   *
   * @param id A number representing the ID of the timeout to be
   *   canceled.
   */
  cancel(id: number): void {
    window.clearTimeout(id);
  }

  add(notification: Notification): void {
    const notifications = this.getAll();
    notifications.push(notification);
    this.notificationsSource.next(notifications);
  }

  getAll(): Notification[] {
    return this.notificationsSource.value;
  }

  removeAll(): void {
    this.notificationsSource.next([]);
  }
}
