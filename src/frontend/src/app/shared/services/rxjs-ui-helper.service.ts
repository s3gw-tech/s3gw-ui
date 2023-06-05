import { Injectable } from '@angular/core';
import { concat, forkJoin, Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';

import { translate } from '~/app/i18n.helper';
import { BlockUiService } from '~/app/shared/services/block-ui.service';
import { NotificationService } from '~/app/shared/services/notification.service';

@Injectable({
  providedIn: 'root'
})
export class RxjsUiHelperService {
  constructor(
    private blockUiService: BlockUiService,
    private notificationService: NotificationService
  ) {}

  /**
   * Sequentially process the given observables.
   * - Block the UI after subscription.
   * - Update the progress message (count, percentage) after each
   *   processed observable.
   * - Create a notification for each processed observable.
   * - Unblock the UI on success or failure.
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
      this.blockUiService.start(translate(messages.start, { total }));
      concat(...sources)
        .pipe(
          finalize(() => {
            this.blockUiService.stop();
          })
        )
        .subscribe({
          next: (value: T) => {
            current += 1;
            this.blockUiService.update(
              translate(messages.next, {
                current,
                total,
                percent: Math.round((Number(current) / Number(total)) * 100)
              })
            );
            this.notificationService.showSuccess(
              translate(notifications.next, notifications.nextFmtArgs(value))
            );
            observer.next(value);
          },
          error: (err) => observer.error(err),
          complete: () => observer.complete()
        });
    });
  }

  /**
   * Process the given observables in parallel.
   * - Block the UI after subscription.
   * - Create a notification after the observables have been processed
   *   successfully.
   * - Unblock the UI on success or failure.
   *
   * @param sources The observables to process.
   * @param message The message that is displayed while the UI is
   *   blocked.
   * @param successNotification The notification that is displayed after
   *   the observables have been successfully processed.
   */
  public forkJoin(
    sources: Observable<any>[],
    message: string,
    successNotification: string
  ): Observable<any> {
    return new Observable((observer: any) => {
      this.blockUiService.start(translate(message));
      forkJoin(sources)
        .pipe(
          finalize(() => {
            this.blockUiService.stop();
          })
        )
        .subscribe({
          next: (value: any) => observer.next(value),
          error: (err) => observer.error(err),
          complete: () => {
            this.notificationService.showSuccess(translate(successNotification));
            observer.complete();
          }
        });
    });
  }
}
