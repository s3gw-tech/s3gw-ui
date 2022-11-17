import { HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import * as _ from 'lodash';
import { forkJoin, iif, Observable, of } from 'rxjs';
import { map, mergeMap } from 'rxjs/operators';

import { Credentials } from '~/app/shared/models/credentials.type';
import { AuthResponse } from '~/app/shared/services/api/auth.service';
import { RgwService } from '~/app/shared/services/api/rgw.service';
import { AuthStorageService } from '~/app/shared/services/auth-storage.service';

export type User = {
  /* eslint-disable @typescript-eslint/naming-convention */
  user_id: string;
  display_name: string;
  email: string;
  max_buckets: number;
  object_usage: number;
  size_usage: number;
  suspended: boolean;
  keys: Key[];
  bucket_quota?: {
    enabled: boolean;
    check_on_raw: boolean;
    max_size: number;
    max_size_kb: number;
    max_objects: number;
  };
  user_quota?: {
    enabled: boolean;
    check_on_raw: boolean;
    max_size: number;
    max_size_kb: number;
    max_objects: number;
  };
  stats?: {
    size: number;
    size_actual: number;
    size_utilized: number;
    size_kb: number;
    size_kb_actual: number;
    size_kb_utilized: number;
    num_objects: number;
  };
  /* eslint-enable @typescript-eslint/naming-convention */
};

export type Key = {
  /* eslint-disable @typescript-eslint/naming-convention */
  access_key?: string;
  secret_key?: string;
  user?: string;
  generate_key?: boolean;
  /* eslint-enable @typescript-eslint/naming-convention */
};

export type Quota = {
  /* eslint-disable @typescript-eslint/naming-convention */
  type: 'user' | 'bucket';
  enabled?: boolean;
  max_size?: number;
  max_objects?: number;
  /* eslint-enable @typescript-eslint/naming-convention */
};

/**
 * Service to handle users via the RGW Admin Ops API.
 */
@Injectable({
  providedIn: 'root'
})
export class AdminOpsUserService {
  constructor(private authStorageService: AuthStorageService, private rgwService: RgwService) {}

  /**
   * Check if the given credentials are valid and the user is allowed
   * to access the RGW Admin Ops API.
   */
  public authenticate(credentials: Credentials): Observable<AuthResponse> {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    const params: Record<string, any> = { 'access-key': credentials.accessKey! };
    return this.rgwService.get<User>('admin/user', { credentials, params }).pipe(
      map((resp: User) => ({
        userId: resp.user_id,
        displayName: resp.display_name,
        isAdmin: true
      }))
    );
  }

  /**
   * Get a list of user IDs.
   */
  public listIds(): Observable<string[]> {
    const credentials: Credentials = this.authStorageService.getCredentials();
    return this.rgwService.get<string[]>('admin/metadata/user', { credentials });
  }

  /**
   * Get a list of users.
   */
  public list(stats: boolean = false): Observable<User[]> {
    return this.listIds().pipe(
      mergeMap((uids: string[]) =>
        iif(
          () => uids.length > 0,
          forkJoin(uids.map((uid: string) => this.get(uid, stats))),
          of([])
        )
      )
    );
  }

  public count(): Observable<number> {
    return this.listIds().pipe(map((uids: string[]) => uids.length));
  }

  /**
   * https://docs.ceph.com/en/latest/radosgw/adminops/#create-user
   */
  public create(user: User): Observable<void> {
    const credentials: Credentials = this.authStorageService.getCredentials();
    const params: Record<string, any> = this.user2Params(user);
    return this.rgwService.put<void>('admin/user', { credentials, params });
  }

  /**
   * https://docs.ceph.com/en/latest/radosgw/adminops/#remove-user
   */
  public delete(uid: string): Observable<void> {
    const credentials: Credentials = this.authStorageService.getCredentials();
    const params: Record<string, any> = { uid };
    return this.rgwService.delete<void>('admin/user', { credentials, params });
  }

  /**
   * https://docs.ceph.com/en/latest/radosgw/adminops/#modify-user
   */
  public update(user: Partial<User>): Observable<User> {
    const credentials: Credentials = this.authStorageService.getCredentials();
    const params: Record<string, any> = this.user2Params(user);
    return this.rgwService.post<User>('admin/user', { credentials, params });
  }

  /**
   * https://docs.ceph.com/en/latest/radosgw/adminops/#get-user-info
   */
  public get(uid: string, stats: boolean = false): Observable<User> {
    const credentials: Credentials = this.authStorageService.getCredentials();
    const params: Record<string, any> = { uid, stats };
    return this.rgwService.get<User>('admin/user', { credentials, params });
  }

  /**
   * Check if the specified user exists.
   */
  public exists(uid: string): Observable<boolean> {
    return this.listIds().pipe(map((uids: string[]) => uids.includes(uid)));
  }

  /**
   * https://docs.ceph.com/en/latest/radosgw/adminops/#create-key
   */
  public createKey(uid: string, key: Key): Observable<void> {
    const credentials: Credentials = this.authStorageService.getCredentials();
    const params: Record<string, any> = this.key2Params(uid, key);
    return this.rgwService.put<void>('admin/user?key', { credentials, params });
  }

  public getKey(uid: string): Observable<Key> {
    return this.get(uid).pipe(map((user: User) => user.keys[0]));
  }

  /**
   * https://docs.ceph.com/en/latest/radosgw/adminops/#remove-key
   */
  public deleteKey(uid: string, accessKey: string): Observable<void> {
    const credentials: Credentials = this.authStorageService.getCredentials();
    const params: Record<string, any> = new HttpParams({
      // eslint-disable-next-line @typescript-eslint/naming-convention
      fromObject: { uid, 'access-key': accessKey }
    });
    return this.rgwService.delete<void>('admin/user?key', { credentials, params });
  }

  /**
   * https://docs.ceph.com/en/latest/radosgw/adminops/#quotas
   */
  updateQuota(uid: string, quota: Quota) {
    const credentials: Credentials = this.authStorageService.getCredentials();
    const params: Record<string, any> = this.quota2Params(uid, quota);
    return this.rgwService.put('admin/user?quota', { credentials, params });
  }

  /**
   * Get the credentials of the specified user.
   */
  public getCredentials(uid: string): Observable<Credentials> {
    return this.get(uid).pipe(
      map((user: User) => {
        const key = user.keys[0];
        return { accessKey: key.access_key!, secretKey: key.secret_key! };
      })
    );
  }

  private user2Params(user: Partial<User>): HttpParams {
    const params: Record<string, any> = {};
    if (_.isString(user.user_id) && !_.isEmpty(user.user_id)) {
      _.set(params, 'uid', user.user_id);
    }
    if (_.isString(user.display_name) && !_.isEmpty(user.display_name)) {
      _.set(params, 'display-name', user.display_name);
    }
    if (_.isString(user.email) && !_.isEmpty(user.email)) {
      _.set(params, 'email', user.email);
    }
    if (_.isNumber(user.max_buckets)) {
      _.set(params, 'max-buckets', user.max_buckets);
    }
    if (_.isBoolean(user.suspended)) {
      _.set(params, 'suspended', user.suspended);
    }
    return new HttpParams({ fromObject: params });
  }

  private key2Params(uid: string, key: Key): HttpParams {
    let params: Record<string, any> = { uid };
    if (_.isString(key.access_key) && !_.isEmpty(key.access_key)) {
      _.set(params, 'access-key', key.access_key);
    }
    if (_.isString(key.secret_key) && !_.isEmpty(key.secret_key)) {
      _.set(params, 'secret-key', key.secret_key);
    }
    if (_.isString(key.user) && !_.isEmpty(key.user)) {
      _.set(params, 'subuser', key.generate_key);
    }
    if (_.isBoolean(key.generate_key)) {
      _.set(params, 'generate-key', key.generate_key);
      params = _.omit(params, ['access-key', 'secret-key']);
    }
    return new HttpParams({ fromObject: params });
  }

  private quota2Params(uid: string, quota: Quota) {
    const params: Record<string, any> = { uid };
    if (_.isString(quota.type)) {
      _.set(params, 'quota-type', quota.type);
    }
    if (_.isBoolean(quota.enabled)) {
      _.set(params, 'enabled', quota.enabled);
    }
    if (_.isNumber(quota.max_size)) {
      _.set(params, 'max-size', quota.max_size);
    }
    if (_.isNumber(quota.max_objects)) {
      _.set(params, 'max-objects', quota.max_objects);
    }
    return new HttpParams({ fromObject: params });
  }
}
