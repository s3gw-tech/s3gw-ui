import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { finalize, tap } from 'rxjs/operators';

import { Credentials } from '~/app/shared/models/credentials.type';
import { AdminOpsUserService, User } from '~/app/shared/services/api/admin-ops-user.service';
import { S3UserService } from '~/app/shared/services/api/s3-user.service';
import { AuthStorageService } from '~/app/shared/services/auth-storage.service';

export type AuthResponse = {
  userId: string;
  displayName: string;
  // The URL the user is redirected to after a successful login.
  redirectUrl: string;
};

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  constructor(
    private authStorageService: AuthStorageService,
    private adminOpsUserService: AdminOpsUserService,
    private s3UserService: S3UserService
  ) {}

  public login(
    accessKey: string,
    secretKey: string,
    admin: boolean = false
  ): Observable<AuthResponse> {
    const credentials: Credentials = Credentials.fromStrings(accessKey, secretKey);
    return (
      admin
        ? this.adminOpsUserService.authenticate(credentials)
        : this.s3UserService.authenticate(credentials)
    ).pipe(
      tap((resp: AuthResponse) => {
        this.authStorageService.set(resp.userId, credentials.accessKey!, credentials.secretKey!);
      })
    );
  }

  logout(): Observable<void> {
    return of().pipe(
      finalize(() => {
        this.authStorageService.revoke();
        document.location.replace('');
      })
    );
  }
}
