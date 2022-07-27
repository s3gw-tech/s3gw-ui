import { Injectable } from '@angular/core';
import * as _ from 'lodash';
import { ToastrService } from 'ngx-toastr';

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

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  constructor(private toastrService: ToastrService) {}

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
}
