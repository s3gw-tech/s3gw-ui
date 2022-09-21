import { Injectable } from '@angular/core';
import * as _ from 'lodash';
import { concat, Observable, of } from 'rxjs';
import { catchError, map, mergeMap } from 'rxjs/operators';

import { RgwService } from '~/app/shared/services/api/rgw.service';
import { Key, UserService } from '~/app/shared/services/api/user.service';
import { AuthStorageService, Credentials } from '~/app/shared/services/auth-storage.service';

type CreateBucketResponse = {
  /* eslint-disable @typescript-eslint/naming-convention */
  bucket_info: {
    bucket: {
      bucket_id: string;
      marker: string;
      name: string;
      tenant: string;
      // ...
    };
    creation_time: string;
    owner: string;
    // ...
  };
  entry_point_object_ver: {
    tag: string;
    ver: number;
  };
  object_ver: {
    tag: string;
    ver: number;
  };
};

type VersioningResponse = {
  MfaDelete: 'Enabled' | 'Disabled';
  Status: 'Enabled' | 'Suspended';
};

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
};

@Injectable({
  providedIn: 'root'
})
export class BucketService {
  constructor(
    private authStorageService: AuthStorageService,
    private rgwService: RgwService,
    private userService: UserService
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

  public create(bucket: Bucket): Observable<CreateBucketResponse> {
    // To create a new bucket the following steps are necessary:
    // 1. Get the credentials of the specified bucket owner.
    // 2. Create the bucket using these credentials.
    return this.userService.getKey(bucket.owner).pipe(
      mergeMap((key: Key) =>
        this.rgwService.put<CreateBucketResponse>(bucket.bucket, {
          credentials: {
            accessKey: key.access_key!,
            secretKey: key.secret_key!
          }
        })
      )
    );
  }

  /**
   * https://docs.ceph.com/en/latest/radosgw/adminops/#remove-bucket
   */
  public delete(bucket: string, purgeObjects: boolean = true): Observable<void> {
    const credentials: Credentials = this.authStorageService.getCredentials();
    const params: Record<string, any> = { bucket, 'purge-objects': purgeObjects };
    return this.rgwService.delete<void>('admin/bucket', { credentials, params });
  }

  public update(bucket: Partial<Bucket>): Observable<void> {
    // First get the original bucket data to find out what needs to be
    // updated.
    return this.get(bucket.bucket!).pipe(
      mergeMap((origBucket: Bucket) => {
        const observables = [];
        // Need to update the `owner` of the bucket?
        if (_.isString(bucket.owner) && bucket.owner !== origBucket.owner) {
          observables.push(this.link(bucket.bucket!, bucket.id!, bucket.owner));
        }
        // Need to update the `versioning` flag?
        if (_.isBoolean(bucket.versioning) && bucket.versioning !== origBucket.versioning) {
          observables.push(this.updateVersioning(bucket.bucket!, bucket.owner!, bucket.versioning));
        }
        // Execute all observables one after the other in series.
        return concat(...observables);
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
      mergeMap((resp: Bucket) =>
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
   * @protected
   */
  private link(bucket: string, bucketId: string, uid: string): Observable<void> {
    const credentials: Credentials = this.authStorageService.getCredentials();
    const params: Record<string, any> = {
      bucket,
      'bucket-id': bucketId,
      uid
    };
    return this.rgwService.put<void>('admin/bucket', { credentials, params });
  }

  /**
   * https://docs.ceph.com/en/latest/radosgw/s3/bucketops/#enable-suspend-bucket-versioning
   *
   * @protected
   */
  private getVersioning(bucket: string, uid: string): Observable<boolean> {
    return this.userService.getKey(uid).pipe(
      mergeMap((key: Key) =>
        this.rgwService
          .get<VersioningResponse>(`${bucket}?versioning`, {
            credentials: {
              accessKey: key.access_key!,
              secretKey: key.secret_key!
            }
          })
          .pipe(map((response: VersioningResponse) => response.Status === 'Enabled'))
      )
    );
  }

  /**
   * https://docs.ceph.com/en/latest/radosgw/s3/bucketops/#enable-suspend-bucket-versioning
   * https://docs.aws.amazon.com/AmazonS3/latest/API/API_PutBucketVersioning.html
   *
   * @protected
   */
  private updateVersioning(bucket: string, uid: string, enabled: boolean): Observable<void> {
    return this.userService.getKey(uid).pipe(
      mergeMap((key: Key) =>
        this.rgwService.put<void>(`${bucket}?versioning`, {
          body: `<VersioningConfiguration><Status>${
            enabled ? 'Enabled' : 'Suspended'
          }</Status></VersioningConfiguration>`,
          headers: {
            'content-type': 'application/xml'
          },
          credentials: {
            accessKey: key.access_key!,
            secretKey: key.secret_key!
          }
        })
      )
    );
  }
}
