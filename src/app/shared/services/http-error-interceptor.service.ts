import {
  HttpErrorResponse,
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest
} from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import * as _ from 'lodash';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { AuthStorageService } from '~/app/shared/services/auth-storage.service';
import { NotificationService } from '~/app/shared/services/notification.service';

@Injectable({
  providedIn: 'root'
})
export class HttpErrorInterceptorService implements HttpInterceptor {
  constructor(
    private authStorageService: AuthStorageService,
    private notificationService: NotificationService,
    private router: Router
  ) {}

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    return next.handle(request).pipe(
      catchError((err) => {
        if (err instanceof HttpErrorResponse) {
          switch (err.status) {
            case 401:
              this.authStorageService.revoke();
              this.router.navigate(['/login']);
              break;
            case 403:
              // E.g. invalid access key.
              this.authStorageService.revoke();
              this.router.navigate(['/login']);
              break;
            default:
              const message = _.get(err, 'error.detail', err.message);
              const title = _.get(err, 'error.Code', err.statusText);
              const notificationId: number = this.notificationService.show(message, title, {
                type: 'error'
              });
              // Decorate preventDefault method. If called, it will prevent a
              // notification to be shown.
              (err as any).preventDefault = () => {
                this.notificationService.cancel(notificationId);
              };
              break;
          }
        }
        return throwError(err);
      })
    );
  }
}
