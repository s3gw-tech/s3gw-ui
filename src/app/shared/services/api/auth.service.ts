import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { finalize, tap } from 'rxjs/operators';

import { RgwAdminOpsService } from '~/app/shared/services/api/rgw-admin-ops.service';
import { User } from '~/app/shared/services/api/user.service';
import { AuthStorageService, Credentials } from '~/app/shared/services/auth-storage.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private url = 'api/auth';

  constructor(
    private authStorageService: AuthStorageService,
    private rgwAdminOpsService: RgwAdminOpsService
  ) {}

  public login(accessKey: string, secretKey: string): Observable<User> {
    const credentials: Credentials = { accessKey, secretKey };
    // eslint-disable-next-line @typescript-eslint/naming-convention
    const params = { 'access-key': accessKey };
    return this.rgwAdminOpsService.get<User>('admin/user', { params, credentials }).pipe(
      tap(() => {
        this.authStorageService.set(accessKey, secretKey);
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
