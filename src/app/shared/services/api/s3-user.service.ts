import { Injectable } from '@angular/core';
import * as AWS from 'aws-sdk';
import { defer, Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { Credentials } from '~/app/shared/models/credentials.type';
import { AuthResponse } from '~/app/shared/services/api/auth.service';
import { RgwService } from '~/app/shared/services/api/rgw.service';
import { S3ClientService } from '~/app/shared/services/api/s3-client.service';
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
  constructor(
    private authStorageService: AuthStorageService,
    private rgwService: RgwService,
    private s3ClientService: S3ClientService
  ) {}

  /**
   * Check if the given credentials are valid.
   */
  public authenticate(credentials: Credentials): Observable<AuthResponse> {
    // Note, we need to convert the hot promise to a cold observable.
    return defer(() => this.s3ClientService.get(credentials).listBuckets().promise()).pipe(
      map((resp: AWS.S3.Types.ListBucketsOutput) => ({
        userId: resp.Owner!.ID!,
        displayName: resp.Owner!.DisplayName!,
        isAdmin: false
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
