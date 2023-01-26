import { Injectable } from '@angular/core';
import * as AWS from 'aws-sdk';
import { defer, Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { Credentials } from '~/app/shared/models/credentials.type';
import { AuthResponse } from '~/app/shared/services/api/auth.service';
import { RgwService } from '~/app/shared/services/api/rgw.service';
import { S3ClientService } from '~/app/shared/services/api/s3-client.service';
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
    const credentials: Credentials = this.authSessionService.getCredentials();
    const params: Record<string, any> = { usage: '' };
    return this.rgwService.get<S3UserStats>('', { credentials, params });
  }
}
