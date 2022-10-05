import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { Credentials } from '~/app/shared/models/credentials.type';
import { BucketListResponse } from '~/app/shared/models/s3-api.type';
import { AuthResponse } from '~/app/shared/services/api/auth.service';
import { RgwService } from '~/app/shared/services/api/rgw.service';
import { AuthStorageService } from '~/app/shared/services/auth-storage.service';

export type S3UserStats = {
  /* eslint-disable @typescript-eslint/naming-convention */
  Summary: object;
  TotalBytes: number;
  TotalBytesRounded: number;
  TotalEntries: number;
  /* eslint-enable @typescript-eslint/naming-convention */
};

/**
 * Service to handle users via the S3 API.
 */
@Injectable({
  providedIn: 'root'
})
export class S3UserService {
  constructor(private authStorageService: AuthStorageService, private rgwService: RgwService) {}

  /**
   * Check if the given credentials are valid.
   */
  public authenticate(credentials: Credentials): Observable<AuthResponse> {
    return this.rgwService.get<BucketListResponse>('', { credentials }).pipe(
      map((resp: BucketListResponse) => ({
        userId: resp[0].ID,
        displayName: resp[0].DisplayName,
        redirectUrl: '/user'
      }))
    );
  }

  /**
   * https://docs.ceph.com/en/latest/radosgw/s3/serviceops/#get-usage-stats
   */
  public stats(): Observable<S3UserStats> {
    const credentials: Credentials = this.authStorageService.getCredentials();
    const params: Record<string, any> = { usage: '' };
    return this.rgwService.get<S3UserStats>('', { credentials, params });
  }
}
