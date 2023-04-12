import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, finalize, tap } from 'rxjs/operators';

import { Credentials } from '~/app/shared/models/credentials.type';
import { AdminOpsUserService } from '~/app/shared/services/api/admin-ops-user.service';
import { S3UserService } from '~/app/shared/services/api/s3-user.service';
import { AuthSessionService } from '~/app/shared/services/auth-session.service';

export type AuthResponse = {
  userId: string;
  displayName: string;
  isAdmin: boolean;
};

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  constructor(
    private authSessionService: AuthSessionService,
    private adminOpsUserService: AdminOpsUserService,
    private s3UserService: S3UserService
  ) {}

  public login(accessKey: string, secretKey: string): Observable<AuthResponse> {
    const credentials: Credentials = Credentials.fromStrings(accessKey, secretKey);
    // Try to access a RGW Admin Ops endpoint first. If that works, the
    // given credentials have `admin` privileges. If it fails, try to
    // access a RGW endpoint. If that works, the given credentials can
    // be used to sign in as `regular` user.
    return this.adminOpsUserService.authenticate(credentials).pipe(
      catchError(() => this.s3UserService.authenticate(credentials)),
      tap((resp: AuthResponse) => {
        this.authSessionService.set(
          resp.userId,
          credentials.accessKey!,
          credentials.secretKey!,
          resp.isAdmin
        );
      })
    );
  }

  logout(): Observable<void> {
    return of().pipe(
      finalize(() => {
        this.authSessionService.revoke();
        document.location.replace('');
      })
    );
  }
}
