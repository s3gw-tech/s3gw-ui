import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { finalize, tap } from 'rxjs/operators';

import { Credentials } from '~/app/shared/models/credentials.type';
import { S3gwApiService } from '~/app/shared/services/api/s3gw-api.service';
import { AuthSessionService } from '~/app/shared/services/auth-session.service';

export type AuthResponse = {
  /* eslint-disable @typescript-eslint/naming-convention */
  ID: string;
  DisplayName: string;
  IsAdmin: boolean;
  /* eslint-enable @typescript-eslint/naming-convention */
};

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  constructor(
    private authSessionService: AuthSessionService,
    private s3gwApiService: S3gwApiService
  ) {}

  public login(accessKey: string, secretKey: string): Observable<AuthResponse> {
    const credentials: Credentials = Credentials.fromStrings(accessKey, secretKey);
    return this.s3gwApiService.get<AuthResponse>('auth/authenticate', { credentials }).pipe(
      tap((resp: AuthResponse) => {
        this.authSessionService.set(
          resp.ID,
          credentials.accessKey!,
          credentials.secretKey!,
          resp.IsAdmin
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
