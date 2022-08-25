import { Injectable } from '@angular/core';
import * as _ from 'lodash';
import { Observable, of } from 'rxjs';
import { catchError, map, mergeMap } from 'rxjs/operators';

import { RgwService } from '~/app/shared/services/api/rgw.service';
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
};

@Injectable({
  providedIn: 'root'
})
export class BucketService {
  constructor(private authStorageService: AuthStorageService, private rgwService: RgwService) {}

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

  public create(bucket: Bucket): Observable<void> {
    // To create a new bucket the following steps are necessary:
    // 1. Create the bucket. The owner is the current admin user.
    // 2. Link the bucket to the specified user.
    const credentials: Credentials = this.authStorageService.getCredentials();
    return this.rgwService.put<CreateBucketResponse>(bucket.bucket, { credentials }).pipe(
      mergeMap((res: CreateBucketResponse) =>
        this.update({
          id: res.bucket_info.bucket.bucket_id,
          bucket: res.bucket_info.bucket.name,
          owner: bucket.owner
        })
      )
    );
  }

  public delete(bid: string, purgeObjects: boolean = true): Observable<void> {
    const credentials: Credentials = this.authStorageService.getCredentials();
    const params: Record<string, any> = { bucket: bid, 'purge-objects': purgeObjects };
    return this.rgwService.delete<void>('admin/bucket', { credentials, params });
  }

  public update(bucket: Partial<Bucket>): Observable<void> {
    const credentials: Credentials = this.authStorageService.getCredentials();
    const params: Record<string, any> = {
      bucket: bucket.bucket,
      'bucket-id': bucket.id,
      uid: bucket.owner
    };
    // Link the bucket to (new) user.
    // https://docs.ceph.com/en/latest/radosgw/adminops/#link-bucket
    return this.rgwService.put<void>('admin/bucket', { credentials, params });
  }

  /**
   * https://docs.ceph.com/en/latest/radosgw/adminops/#get-bucket-info
   */
  public get(bid: string): Observable<Bucket> {
    const credentials: Credentials = this.authStorageService.getCredentials();
    const params: Record<string, any> = { bucket: bid };
    return this.rgwService.get<Bucket>('admin/bucket', { credentials, params });
  }

  /**
   * Check if the specified bucket exists.
   */
  public exists(bid: string): Observable<boolean> {
    return this.get(bid).pipe(
      map(() => true),
      catchError((error) => {
        if (_.isFunction(error.preventDefault)) {
          error.preventDefault();
        }
        return of(false);
      })
    );
  }
}
