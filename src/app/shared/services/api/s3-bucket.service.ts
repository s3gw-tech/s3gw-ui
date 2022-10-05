import { Injectable } from '@angular/core';
import * as _ from 'lodash';
import { concat, Observable, of, toArray } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';

import { Credentials } from '~/app/shared/models/credentials.type';
import {
  Bucket,
  BucketListResponse,
  CreateBucketResponse,
  VersioningResponse
} from '~/app/shared/models/s3-api.type';
import { RgwService } from '~/app/shared/services/api/rgw.service';
import { AuthStorageService } from '~/app/shared/services/auth-storage.service';

export type S3Bucket = Bucket & {
  /* eslint-disable @typescript-eslint/naming-convention */
  Versioning?: boolean;
  /* eslint-enable @typescript-eslint/naming-convention */
};

/**
 * Service to handle buckets via the S3 API.
 */
@Injectable({
  providedIn: 'root'
})
export class S3BucketService {
  constructor(private authStorageService: AuthStorageService, private rgwService: RgwService) {}

  /**
   * https://docs.ceph.com/en/latest/radosgw/s3/serviceops/#list-buckets
   */
  public list(): Observable<S3Bucket[]> {
    const credentials: Credentials = this.authStorageService.getCredentials();
    return this.rgwService
      .get<BucketListResponse>('', { credentials })
      .pipe(map((resp) => resp[1]));
  }

  public count(): Observable<number> {
    const credentials: Credentials = this.authStorageService.getCredentials();
    return this.rgwService
      .get<BucketListResponse>('', { credentials })
      .pipe(map((resp: BucketListResponse) => resp[1].length));
  }

  /**
   * https://docs.ceph.com/en/latest/radosgw/s3/bucketops/#get-bucket
   */
  public get(bucket: string): Observable<S3Bucket> {
    const credentials: Credentials = this.authStorageService.getCredentials();
    // eslint-disable-next-line @typescript-eslint/naming-convention
    const params: Record<string, any> = { 'max-keys': 0 };
    return this.rgwService.get<S3Bucket>(`${bucket}`, { credentials, params }).pipe(
      switchMap((resp: S3Bucket) =>
        this.getVersioningByCredentials(bucket, credentials).pipe(
          map((enabled: boolean) => {
            resp.Versioning = enabled;
            return resp;
          })
        )
      )
    );
  }

  public exists(bucket: string): Observable<boolean> {
    return this.get(bucket).pipe(
      map(() => true),
      catchError((error) => {
        if (_.isFunction(error.preventDefault)) {
          error.preventDefault();
        }
        return of(false);
      })
    );
  }

  /**
   * https://docs.ceph.com/en/latest/radosgw/s3/bucketops/#put-bucket
   */
  public create(bucket: S3Bucket): Observable<CreateBucketResponse> {
    const credentials: Credentials = this.authStorageService.getCredentials();
    return this.createByCredentials(bucket, credentials);
  }

  public createByCredentials(
    bucket: S3Bucket,
    credentials: Credentials
  ): Observable<CreateBucketResponse> {
    const sources = [];
    // Create the bucket first.
    sources.push(
      this.rgwService.put<CreateBucketResponse>(bucket.Name, {
        credentials
      })
    );
    // Update the `versioning` flag.
    if (bucket.Versioning) {
      sources.push(this.updateVersioningByCredentials(bucket.Name, true, credentials));
    }
    // Execute all observables one after the other in series. Return
    // the response of the request that has created the bucket.
    return concat(...sources).pipe(
      toArray(),
      map((resp: unknown[]): CreateBucketResponse => resp[0] as CreateBucketResponse)
    );
  }

  public update(bucket: Partial<S3Bucket>): Observable<S3Bucket> {
    // First get the original bucket data to find out what needs to be
    // updated.
    return this.get(bucket.Name!).pipe(
      switchMap((currentBucket: S3Bucket) => {
        const sources = [];
        // Need to update the `versioning` flag?
        if (_.isBoolean(bucket.Versioning) && bucket.Versioning !== currentBucket.Versioning) {
          currentBucket.Versioning = bucket.Versioning;
          sources.push(this.updateVersioning(bucket.Name!, bucket.Versioning));
        }
        // Execute all observables one after the other in series. Return
        // the bucket object with the modified properties.
        return concat(...sources).pipe(
          toArray(),
          map((): Bucket => currentBucket)
        );
      })
    );
  }

  /**
   * https://docs.ceph.com/en/latest/radosgw/s3/bucketops/#delete-bucket
   */
  public delete(bucket: string): Observable<void> {
    const credentials: Credentials = this.authStorageService.getCredentials();
    return this.rgwService.delete<void>(`${bucket}`, { credentials });
  }

  /**
   * https://docs.ceph.com/en/latest/radosgw/s3/bucketops/#enable-suspend-bucket-versioning
   */
  public getVersioning(bucket: string): Observable<boolean> {
    const credentials: Credentials = this.authStorageService.getCredentials();
    return this.getVersioningByCredentials(bucket, credentials);
  }

  public getVersioningByCredentials(bucket: string, credentials: Credentials): Observable<boolean> {
    return this.rgwService
      .get<VersioningResponse>(`${bucket}?versioning`, {
        credentials
      })
      .pipe(map((response: VersioningResponse) => response.Status === 'Enabled'));
  }

  /**
   * https://docs.ceph.com/en/latest/radosgw/s3/bucketops/#enable-suspend-bucket-versioning
   * https://docs.aws.amazon.com/AmazonS3/latest/API/API_PutBucketVersioning.html
   */
  public updateVersioning(bucket: string, enabled: boolean): Observable<void> {
    const credentials: Credentials = this.authStorageService.getCredentials();
    return this.updateVersioningByCredentials(bucket, enabled, credentials);
  }

  public updateVersioningByCredentials(
    bucket: string,
    enabled: boolean,
    credentials: Credentials
  ): Observable<void> {
    return this.rgwService.put<void>(`${bucket}?versioning`, {
      body: `<VersioningConfiguration><Status>${
        enabled ? 'Enabled' : 'Suspended'
      }</Status></VersioningConfiguration>`,
      headers: {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        'content-type': 'application/xml'
      },
      credentials
    });
  }
}
