import { Injectable } from '@angular/core';
import * as AWS from 'aws-sdk';
import * as _ from 'lodash';
import { concat, Observable, of, toArray } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';

import { Credentials } from '~/app/shared/models/credentials.type';
import { AdminOpsUserService, Key } from '~/app/shared/services/api/admin-ops-user.service';
import { RgwService } from '~/app/shared/services/api/rgw.service';
import {
  S3Bucket,
  S3BucketAttributes,
  S3BucketService
} from '~/app/shared/services/api/s3-bucket.service';
import { AuthSessionService } from '~/app/shared/services/auth-session.service';

export type Bucket = BucketExtraAttributes & {
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
  /* eslint-enable @typescript-eslint/naming-convention */
};

type BucketExtraAttributes = {
  tags?: AWS.S3.Types.TagSet;
  versioning?: boolean;
};

/**
 * Service to handle buckets via the RGW Admin Ops API.
 */
@Injectable({
  providedIn: 'root'
})
export class AdminOpsBucketService {
  constructor(
    private authSessionService: AuthSessionService,
    private rgwService: RgwService,
    private s3BucketService: S3BucketService,
    private userService: AdminOpsUserService
  ) {}

  /**
   * https://docs.ceph.com/en/latest/radosgw/adminops/#get-bucket-info
   */
  public list(stats: boolean = false, uid: string = ''): Observable<Bucket[]> {
    const credentials: Credentials = this.authSessionService.getCredentials();
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

  public create(bucket: Bucket): Observable<S3Bucket> {
    // To create a new bucket the following steps are necessary:
    // 1. Get the credentials of the specified bucket owner.
    // 2. Create the bucket using these credentials.
    return this.userService.getKey(bucket.owner).pipe(
      switchMap((key: Key) => {
        const credentials: Credentials = Credentials.fromKey(key);
        return this.s3BucketService.create(
          {
            /* eslint-disable @typescript-eslint/naming-convention */
            Name: bucket.bucket,
            Versioning: bucket.versioning,
            TagSet: bucket.tags
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
  public delete(bucket: string, purgeObjects: boolean = true): Observable<string> {
    const credentials: Credentials = this.authSessionService.getCredentials();
    // eslint-disable-next-line @typescript-eslint/naming-convention
    const params: Record<string, any> = { bucket, 'purge-objects': purgeObjects };
    return this.rgwService
      .delete<void>('admin/bucket', { credentials, params })
      .pipe(map(() => bucket));
  }

  public update(bucket: Partial<Bucket>): Observable<Bucket> {
    // First get the original bucket data to find out what needs to be
    // updated.
    return this.get(bucket.bucket!).pipe(
      switchMap((currentBucket: Bucket) => {
        const sources = [];
        // Need to update the `owner` of the bucket? Note, this needs to be
        // done before the bucket is updated because the S3 API is called
        // with the new owner credentials.
        if (_.isString(bucket.owner) && bucket.owner !== currentBucket.owner) {
          currentBucket.owner = bucket.owner;
          sources.push(this.link(bucket.bucket!, bucket.id!, bucket.owner));
        }
        // Update various bucket information that are not available via the
        // Admin Ops API.
        if (
          !_.isEqual(bucket.tags, currentBucket.tags) ||
          !_.isEqual(bucket.versioning, currentBucket.versioning)
        ) {
          if (!_.isEqual(bucket.tags, currentBucket.tags)) {
            currentBucket.tags = bucket.tags;
          }
          if (!_.isEqual(bucket.versioning, currentBucket.versioning)) {
            currentBucket.versioning = bucket.versioning;
          }
          sources.push(this.setAttributes(bucket, bucket.owner!));
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
    const credentials: Credentials = this.authSessionService.getCredentials();
    const params: Record<string, any> = { bucket };
    return this.rgwService.get<Bucket>('admin/bucket', { credentials, params }).pipe(
      switchMap((resp: Bucket) =>
        this.getAttributes(resp.bucket, resp.owner).pipe(
          map((attr: BucketExtraAttributes) => {
            _.merge(resp, attr);
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
    const credentials: Credentials = this.authSessionService.getCredentials();
    const params: Record<string, any> = {
      bucket,
      // eslint-disable-next-line @typescript-eslint/naming-convention
      'bucket-id': bucketId,
      uid
    };
    return this.rgwService.put<void>('admin/bucket', { credentials, params });
  }

  /**
   * Helper function to get additional bucket information that are not available
   * via the Admin Ops API.
   *
   * @param bucket The name of the bucket.
   * @param uid The ID of the user.
   *
   * @private
   */
  private getAttributes(bucket: string, uid: string): Observable<BucketExtraAttributes> {
    return this.userService.getKey(uid).pipe(
      switchMap((key: Key) => {
        const credentials: Credentials = Credentials.fromKey(key);
        return this.s3BucketService.getAttributes(bucket, credentials).pipe(
          map((resp: S3BucketAttributes) => {
            return {
              tags: resp.TagSet,
              versioning: resp.Versioning
            };
          })
        );
      })
    );
  }

  /**
   * Helper function to set additional bucket information that are not available
   * via the Admin Ops API.
   *
   * @param bucket The bucket data.
   * @param uid The ID of the user.
   *
   * @private
   */
  private setAttributes(bucket: Partial<Bucket>, uid: string): Observable<S3Bucket> {
    return this.userService.getKey(uid).pipe(
      switchMap((key: Key) => {
        const credentials: Credentials = Credentials.fromKey(key);
        return this.s3BucketService.update(
          {
            /* eslint-disable @typescript-eslint/naming-convention */
            Name: bucket.bucket!,
            TagSet: bucket.tags,
            Versioning: bucket.versioning
            /* eslint-enable @typescript-eslint/naming-convention */
          },
          credentials
        );
      })
    );
  }
}
