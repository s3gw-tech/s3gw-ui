import { Injectable } from '@angular/core';
import * as _ from 'lodash';
import { concat, Observable, of, toArray } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';

import { Credentials } from '~/app/shared/models/credentials.type';
import { CreateBucketResponse } from '~/app/shared/models/s3-api.type';
import { AdminOpsUserService, Key } from '~/app/shared/services/api/admin-ops-user.service';
import { RgwService } from '~/app/shared/services/api/rgw.service';
import { S3BucketService } from '~/app/shared/services/api/s3-bucket.service';
import { AuthStorageService } from '~/app/shared/services/auth-storage.service';

export type Bucket = {
  /* eslint-disable @typescript-eslint/naming-convention */
  id: string;
  bucket: string;
  owner: string;
  tenant: string;
  num_shards: number;
  zonegroup: string;
  placement_rule: string;
  marker: string;
  index_type: string;
  ver: string;
  master_ver: string;
  mtime: string;
  creation_time: string;
  max_marker: string;
  usage: {
    'rgw.main': {
      size_actual: number;
      num_objects: number;
    };
  };
  bucket_quota: {
    enabled: boolean;
    check_on_raw: boolean;
    max_size: number;
    max_size_kb: number;
    max_objects: number;
  };
  versioning?: boolean;
  /* eslint-enable @typescript-eslint/naming-convention */
};

/**
 * Service to handle buckets via the RGW Admin Ops API.
 */
@Injectable({
  providedIn: 'root'
})
export class AdminOpsBucketService {
  constructor(
    private authStorageService: AuthStorageService,
    private rgwService: RgwService,
    private s3BucketService: S3BucketService,
    private userService: AdminOpsUserService
  ) {}

  /**
   * https://docs.ceph.com/en/latest/radosgw/adminops/#get-bucket-info
   */
  public list(stats: boolean = false, uid: string = ''): Observable<Bucket[]> {
    const credentials: Credentials = this.authStorageService.getCredentials();
    const params: Record<string, any> = {
      stats
    };
    if (!_.isEmpty(uid)) {
      _.set(params, 'uid', uid);
    }
    return this.rgwService.get<Bucket[]>('admin/bucket', { credentials, params });
  }

  public count(uid: string = ''): Observable<number> {
    return this.list(true, uid).pipe(map((buckets: Bucket[]) => buckets.length));
  }

  public create(bucket: Bucket): Observable<CreateBucketResponse> {
    // To create a new bucket the following steps are necessary:
    // 1. Get the credentials of the specified bucket owner.
    // 2. Create the bucket using these credentials.
    return this.userService.getKey(bucket.owner).pipe(
      switchMap((key: Key) => {
        const credentials: Credentials = Credentials.fromKey(key);
        return this.s3BucketService.createByCredentials(
          {
            /* eslint-disable @typescript-eslint/naming-convention */
            Name: bucket.bucket,
            Versioning: bucket.versioning
            /* eslint-enable @typescript-eslint/naming-convention */
          },
          credentials
        );
      })
    );
  }

  /**
   * https://docs.ceph.com/en/latest/radosgw/adminops/#remove-bucket
   */
  public delete(bucket: string, purgeObjects: boolean = true): Observable<void> {
    const credentials: Credentials = this.authStorageService.getCredentials();
    // eslint-disable-next-line @typescript-eslint/naming-convention
    const params: Record<string, any> = { bucket, 'purge-objects': purgeObjects };
    return this.rgwService.delete<void>('admin/bucket', { credentials, params });
  }

  public update(bucket: Partial<Bucket>): Observable<Bucket> {
    // First get the original bucket data to find out what needs to be
    // updated.
    return this.get(bucket.bucket!).pipe(
      switchMap((currentBucket: Bucket) => {
        const sources = [];
        // Need to update the `owner` of the bucket?
        if (_.isString(bucket.owner) && bucket.owner !== currentBucket.owner) {
          currentBucket.owner = bucket.owner;
          sources.push(this.link(bucket.bucket!, bucket.id!, bucket.owner));
        }
        // Need to update the `versioning` flag?
        if (_.isBoolean(bucket.versioning) && bucket.versioning !== currentBucket.versioning) {
          currentBucket.versioning = bucket.versioning;
          sources.push(this.updateVersioning(bucket.bucket!, bucket.versioning, bucket.owner!));
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
   * https://docs.ceph.com/en/latest/radosgw/adminops/#get-bucket-info
   */
  public get(bucket: string): Observable<Bucket> {
    const credentials: Credentials = this.authStorageService.getCredentials();
    const params: Record<string, any> = { bucket };
    return this.rgwService.get<Bucket>('admin/bucket', { credentials, params }).pipe(
      switchMap((resp: Bucket) =>
        this.getVersioning(resp.bucket, resp.owner).pipe(
          map((enabled: boolean) => {
            resp.versioning = enabled;
            return resp;
          })
        )
      )
    );
  }

  /**
   * Check if the specified bucket exists.
   */
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
   * https://docs.ceph.com/en/latest/radosgw/adminops/#link-bucket
   *
   * @private
   */
  private link(bucket: string, bucketId: string, uid: string): Observable<void> {
    const credentials: Credentials = this.authStorageService.getCredentials();
    const params: Record<string, any> = {
      bucket,
      // eslint-disable-next-line @typescript-eslint/naming-convention
      'bucket-id': bucketId,
      uid
    };
    return this.rgwService.put<void>('admin/bucket', { credentials, params });
  }

  private getVersioning(bucket: string, uid: string): Observable<boolean> {
    return this.userService.getKey(uid).pipe(
      switchMap((key: Key) => {
        const credentials: Credentials = Credentials.fromKey(key);
        return this.s3BucketService.getVersioningByCredentials(bucket, credentials);
      })
    );
  }

  private updateVersioning(bucket: string, enabled: boolean, uid: string): Observable<void> {
    return this.userService.getKey(uid).pipe(
      switchMap((key: Key) => {
        const credentials: Credentials = Credentials.fromKey(key);
        return this.s3BucketService.updateVersioningByCredentials(bucket, enabled, credentials);
      })
    );
  }
}
