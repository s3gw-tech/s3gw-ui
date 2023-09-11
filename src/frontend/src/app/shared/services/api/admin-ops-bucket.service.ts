import { Injectable } from '@angular/core';
import * as _ from 'lodash';
import { concat, Observable, of, toArray } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';

import { isEqualOrUndefined } from '~/app/functions.helper';
import { Credentials } from '~/app/shared/models/credentials.type';
import { AdminOpsUserService, Key } from '~/app/shared/services/api/admin-ops-user.service';
import {
  S3Bucket,
  S3BucketAttributes,
  S3BucketService,
  S3TagSet
} from '~/app/shared/services/api/s3-bucket.service';
import { S3gwApiService } from '~/app/shared/services/api/s3gw-api.service';
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
  /* eslint-disable @typescript-eslint/naming-convention */
  tags?: S3TagSet;
  versioning_enabled?: boolean;
  object_lock_enabled?: boolean;
  retention_enabled?: boolean;
  retention_mode?: 'GOVERNANCE' | 'COMPLIANCE';
  retention_validity?: number;
  retention_unit?: 'Days' | 'Years';
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
    private authSessionService: AuthSessionService,
    private s3BucketService: S3BucketService,
    private s3gwApiService: S3gwApiService,
    private adminOpsUserService: AdminOpsUserService
  ) {}

  public list(uid?: string): Observable<Bucket[]> {
    const credentials: Credentials = this.authSessionService.getCredentials();
    const params: Record<string, any> = {};
    if (_.isString(uid)) {
      _.set(params, 'uid', uid);
    }
    return this.s3gwApiService.get<Bucket[]>('admin/buckets/', { credentials, params });
  }

  public count(uid?: string): Observable<number> {
    return this.list(uid).pipe(map((buckets: Bucket[]) => buckets.length));
  }

  public create(bucket: Bucket): Observable<S3Bucket> {
    // To create a new bucket the following steps are necessary:
    // 1. Get the credentials of the specified bucket owner.
    // 2. Create the bucket using these credentials.
    return this.adminOpsUserService.getKey(bucket.owner).pipe(
      switchMap((key: Key) => {
        const credentials: Credentials = Credentials.fromKey(key);
        return this.s3BucketService.create(
          {
            /* eslint-disable @typescript-eslint/naming-convention */
            Name: bucket.bucket,
            VersioningEnabled: bucket.versioning_enabled,
            ObjectLockEnabled: bucket.object_lock_enabled,
            RetentionEnabled: bucket.retention_enabled,
            RetentionMode: bucket.retention_mode,
            RetentionValidity: bucket.retention_validity,
            RetentionUnit: bucket.retention_unit,
            TagSet: bucket.tags
            /* eslint-enable @typescript-eslint/naming-convention */
          },
          credentials
        );
      })
    );
  }

  public delete(bucket: string, purgeObjects: boolean = true): Observable<string> {
    const credentials: Credentials = this.authSessionService.getCredentials();
    // eslint-disable-next-line @typescript-eslint/naming-convention
    const params: Record<string, any> = { purge_objects: purgeObjects };
    return this.s3gwApiService.delete<string>(`admin/buckets/${bucket}`, { credentials, params });
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
          !isEqualOrUndefined(bucket.tags, currentBucket.tags) ||
          !isEqualOrUndefined(bucket.versioning_enabled, currentBucket.versioning_enabled) ||
          !isEqualOrUndefined(bucket.retention_enabled, currentBucket.retention_enabled) ||
          !isEqualOrUndefined(bucket.retention_mode, currentBucket.retention_mode) ||
          !isEqualOrUndefined(bucket.retention_validity, currentBucket.retention_validity) ||
          !isEqualOrUndefined(bucket.retention_unit, currentBucket.retention_unit)
        ) {
          // Update the tags?
          if (!isEqualOrUndefined(bucket.tags, currentBucket.tags)) {
            currentBucket.tags = bucket.tags;
          }
          // Update versioning?
          if (!isEqualOrUndefined(bucket.versioning_enabled, currentBucket.versioning_enabled)) {
            currentBucket.versioning_enabled = bucket.versioning_enabled;
          }
          // Update object locking?
          if (
            currentBucket.object_lock_enabled === true &&
            (!_.isEqual(bucket.retention_enabled, currentBucket.retention_enabled) ||
              !_.isEqual(bucket.retention_mode, currentBucket.retention_mode) ||
              !_.isEqual(bucket.retention_validity, currentBucket.retention_validity) ||
              !_.isEqual(bucket.retention_unit, currentBucket.retention_unit))
          ) {
            currentBucket.retention_enabled = bucket.retention_enabled;
            currentBucket.retention_mode = bucket.retention_mode;
            currentBucket.retention_validity = bucket.retention_validity;
            currentBucket.retention_unit = bucket.retention_unit;
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

  public get(bucket: string): Observable<Bucket> {
    const credentials: Credentials = this.authSessionService.getCredentials();
    return this.s3gwApiService.get<Bucket>(`admin/buckets/${bucket}`, { credentials }).pipe(
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
    const credentials: Credentials = this.authSessionService.getCredentials();
    return this.s3gwApiService.head<Bucket>(`admin/buckets/${bucket}`, { credentials }).pipe(
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
   * Link the bucket to the specified user.
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
    return this.s3gwApiService.put<void>(`admin/buckets/${bucket}/link`, { credentials, params });
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
    return this.adminOpsUserService.getKey(uid).pipe(
      switchMap((key: Key) => {
        const credentials: Credentials = Credentials.fromKey(key);
        return this.s3BucketService.getAttributes(bucket, credentials).pipe(
          map((resp: S3BucketAttributes) => {
            return {
              /* eslint-disable @typescript-eslint/naming-convention */
              tags: resp.TagSet,
              versioning_enabled: resp.VersioningEnabled,
              object_lock_enabled: resp.ObjectLockEnabled,
              retention_enabled: resp.RetentionEnabled,
              retention_mode: resp.RetentionMode,
              retention_validity: resp.RetentionValidity,
              retention_unit: resp.RetentionUnit
              /* eslint-enable @typescript-eslint/naming-convention */
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
    return this.adminOpsUserService.getKey(uid).pipe(
      switchMap((key: Key) => {
        const credentials: Credentials = Credentials.fromKey(key);
        return this.s3BucketService.update(
          {
            /* eslint-disable @typescript-eslint/naming-convention */
            Name: bucket.bucket!,
            TagSet: bucket.tags,
            VersioningEnabled: bucket.versioning_enabled,
            ObjectLockEnabled: bucket.object_lock_enabled,
            RetentionEnabled: bucket.retention_enabled,
            // @ts-ignore
            RetentionMode: bucket.retention_mode,
            RetentionValidity: bucket.retention_validity,
            RetentionUnit: bucket.retention_unit
            /* eslint-enable @typescript-eslint/naming-convention */
          },
          credentials
        );
      })
    );
  }
}
