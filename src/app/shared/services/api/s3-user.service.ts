import { Injectable } from '@angular/core';
import * as AWS from 'aws-sdk';
import { defer, from, Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { Credentials } from '~/app/shared/models/credentials.type';
import { AuthResponse } from '~/app/shared/services/api/auth.service';
import { RgwService } from '~/app/shared/services/api/rgw.service';
import { AuthStorageService } from '~/app/shared/services/auth-storage.service';
import { RgwServiceConfigService } from '~/app/shared/services/rgw-service-config.service';

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
    private rgwServiceConfigService: RgwServiceConfigService
  ) {}

  /**
   * Check if the given credentials are valid.
   */
  public authenticate(credentials: Credentials): Observable<AuthResponse> {
    const s3Client = new AWS.S3({
      credentials: {
        accessKeyId: credentials.accessKey!,
        secretAccessKey: credentials.secretKey!
      },
      endpoint: this.rgwServiceConfigService.config.url,
      s3ForcePathStyle: true
    });
    // Note, we need to convert the hot promise to a cold observable.
    return defer(() => s3Client.listBuckets().promise()).pipe(
      map((resp: AWS.S3.Types.ListBucketsOutput) => ({
        userId: resp.Owner!.ID!,
        displayName: resp.Owner!.DisplayName!,
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
