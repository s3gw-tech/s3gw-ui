import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { Credentials } from '~/app/shared/models/credentials.type';
import { S3gwApiService } from '~/app/shared/services/api/s3gw-api.service';
import { AuthSessionService } from '~/app/shared/services/auth-session.service';

export type S3UserStats = {
  /* eslint-disable @typescript-eslint/naming-convention */
  Entries: any[];
  Summary: number[];
  CapacityUsed: any[];
  /* eslint-enable @typescript-eslint/naming-convention */
};

/**
 * Service to handle users via the S3 API.
 */
@Injectable({
  providedIn: 'root'
})
export class S3UserService {
  constructor(
    private authSessionService: AuthSessionService,
    private s3gwApiService: S3gwApiService
  ) {}

  public stats(): Observable<S3UserStats> {
    const credentials: Credentials = this.authSessionService.getCredentials();
    const uid: string = this.authSessionService.getUserId()!;
    return this.s3gwApiService.get<S3UserStats>(`admin/users/${uid}/usage-stats`, { credentials });
  }
}
