import { Injectable } from '@angular/core';
import { BlockUI, NgBlockUI } from 'ng-block-ui';
import { concat, Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';

import { format } from '~/app/functions.helper';
import { translate } from '~/app/i18n.helper';
import { NotificationService } from '~/app/shared/services/notification.service';

@Injectable({
  providedIn: 'root'
})
export class RxjsUiHelperService {
  @BlockUI()
  blockUI!: NgBlockUI;

  constructor(private notificationService: NotificationService) {}

  /**
   * Sequentially process the given observables.
   * - Block the UI after subscription.
   * - Update the progress message (count, percentage) after each
   *   processed observable.
   * - Create a notification for each processed observable.
   * - Unblock the UI at the end.
   *
   * @param sources The observables to process.
   * @param messages The templates that are used to format the messages
   *   displayed in the blocking UI element.
   *   The `start` property is displayed after subscription and before
   *   the observables are processed. The `next` property is used to
   *   format the message that is displayed in the UI blocking element
   *   to reflect the progress.
   *   The placeholders `{{ current }}`, `{{ total }}` and `{{ percent }}`
   *   can be used within these templates.
   * @param notifications The notification that is triggered after each
   *   processed observable.
   *   The `next` property contains the template to format the notification
   *   text, whereas `nextFmtArgs` is a callback function that is used to
   *   get the arguments for the string interpolation.
   */
  public concat<T>(
    sources: Observable<T>[],
    messages: {
      start: string;
      next: string;
    },
    notifications: {
      next: string;
      nextFmtArgs: (value: T) => Record<any, any>;
    }
  ): Observable<T> {
    return new Observable<T>((observer: any) => {
      let current = 0;
      const total = sources.length;
      this.blockUI.start(format(translate(messages.start), { total }));
      concat(...sources)
        .pipe(
          finalize(() => {
            this.blockUI.stop();
          })
        )
        .subscribe({
          next: (value: T) => {
            current += 1;
            this.blockUI.update(
              format(translate(messages.next), {
                current,
                total,
                percent: Math.round((Number(current) / Number(total)) * 100)
              })
            );
            this.notificationService.showSuccess(
              format(translate(notifications.next), notifications.nextFmtArgs(value))
            );
            observer.next(value);
          },
          error: (err) => observer.error(err),
          complete: () => observer.complete()
        });
    });
  }
}
