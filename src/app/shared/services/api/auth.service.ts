import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { finalize, tap } from 'rxjs/operators';

import { Credentials } from '~/app/shared/models/credentials.type';
import { RgwService } from '~/app/shared/services/api/rgw.service';
import { User } from '~/app/shared/services/api/user.service';
import { AuthStorageService } from '~/app/shared/services/auth-storage.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  constructor(private authStorageService: AuthStorageService, private rgwService: RgwService) {}

  public login(accessKey: string, secretKey: string): Observable<User> {
    const credentials: Credentials = { accessKey, secretKey };
    // eslint-disable-next-line @typescript-eslint/naming-convention
    const params = { 'access-key': accessKey };
    return this.rgwService.get<User>('admin/user', { params, credentials }).pipe(
      tap((user: User) => {
        this.authStorageService.set(user.user_id, accessKey, secretKey);
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
