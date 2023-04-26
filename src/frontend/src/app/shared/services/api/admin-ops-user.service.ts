import { HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import * as _ from 'lodash';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { Credentials } from '~/app/shared/models/credentials.type';
import { S3gwApiService } from '~/app/shared/services/api/s3gw-api.service';
import { AuthSessionService } from '~/app/shared/services/auth-session.service';

export type User = {
  /* eslint-disable @typescript-eslint/naming-convention */
  user_id: string;
  display_name: string;
  email: string;
  max_buckets: number;
  object_usage: number;
  size_usage: number;
  suspended: boolean;
  admin: boolean;
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
  constructor(
    private authSessionService: AuthSessionService,
    private s3gwApiService: S3gwApiService
  ) {}

  /**
   * Get a list of user IDs.
   */
  public listIds(): Observable<string[]> {
    const credentials: Credentials = this.authSessionService.getCredentials();
    return this.s3gwApiService.get<string[]>('admin/users/', { credentials });
  }

  /**
   * Get a list of users.
   */
  public list(stats: boolean = false): Observable<User[]> {
    const credentials: Credentials = this.authSessionService.getCredentials();
    const params: HttpParams = new HttpParams({ fromObject: { details: true, stats } });
    return this.s3gwApiService.get<User[]>('admin/users/', { credentials, params });
  }

  public count(): Observable<number> {
    return this.listIds().pipe(map((uids: string[]) => uids.length));
  }

  public create(user: User): Observable<User> {
    const credentials: Credentials = this.authSessionService.getCredentials();
    const params: HttpParams = this.user2Params(user);
    return this.s3gwApiService.post<User>('admin/users/', { credentials, params });
  }

  public delete(uid: string): Observable<string> {
    const credentials: Credentials = this.authSessionService.getCredentials();
    return this.s3gwApiService.delete<string>(`admin/users/${uid}`, { credentials });
  }

  public update(user: Partial<User>): Observable<User> {
    const credentials: Credentials = this.authSessionService.getCredentials();
    const params: HttpParams = this.user2Params(_.omit(user, 'user_id'));
    return this.s3gwApiService.put<User>(`admin/users/${user.user_id}`, { credentials, params });
  }

  public get(uid: string, stats: boolean = false): Observable<User> {
    const credentials: Credentials = this.authSessionService.getCredentials();
    const params: Record<string, any> = { stats };
    return this.s3gwApiService.get<User>(`admin/users/${uid}`, { credentials, params });
  }

  /**
   * Check if the specified user exists.
   */
  public exists(uid: string): Observable<boolean> {
    const credentials: Credentials = this.authSessionService.getCredentials();
    return this.s3gwApiService.head(`admin/users/${uid}`, { credentials }).pipe(
      map(() => true),
      catchError((err) => {
        if (_.isFunction(err.preventDefault)) {
          err.preventDefault();
        }
        return of(false);
      })
    );
  }

  public createKey(uid: string, key: Key): Observable<void> {
    const credentials: Credentials = this.authSessionService.getCredentials();
    const params: Record<string, any> = this.key2Params(key);
    return this.s3gwApiService.post<void>(`admin/users/${uid}/keys`, { credentials, params });
  }

  public getKeys(uid: string): Observable<Key[]> {
    const credentials: Credentials = this.authSessionService.getCredentials();
    return this.s3gwApiService.get<Key[]>(`admin/users/${uid}/keys`, { credentials });
  }

  /**
   * Get the first key that is found.
   *
   * @param uid The ID of the user.
   */
  public getKey(uid: string): Observable<Key> {
    return this.getKeys(uid).pipe(map((keys: Key[]): Key => keys[0]));
  }

  public deleteKey(uid: string, accessKey: string): Observable<Key> {
    const credentials: Credentials = this.authSessionService.getCredentials();
    const params: Record<string, any> = new HttpParams({
      // eslint-disable-next-line @typescript-eslint/naming-convention
      fromObject: { access_key: accessKey }
    });
    return this.s3gwApiService.delete<Key>(`admin/users/${uid}/keys`, { credentials, params });
  }

  updateQuota(uid: string, quota: Quota) {
    const credentials: Credentials = this.authSessionService.getCredentials();
    const params: Record<string, any> = this.quota2Params(quota);
    return this.s3gwApiService.put(`admin/users/${uid}/quota`, { credentials, params });
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
      _.set(params, 'display_name', user.display_name);
    }
    if (_.isString(user.email)) {
      _.set(params, 'email', user.email);
    }
    if (_.isNumber(user.max_buckets)) {
      _.set(params, 'max_buckets', user.max_buckets);
    }
    if (_.isBoolean(user.suspended)) {
      _.set(params, 'suspended', user.suspended);
    }
    if (_.isBoolean(user.admin)) {
      _.set(params, 'admin', user.admin);
    }
    return new HttpParams({ fromObject: params });
  }

  private key2Params(key: Key): HttpParams {
    let params: Record<string, any> = {};
    if (_.isString(key.access_key) && !_.isEmpty(key.access_key)) {
      _.set(params, 'access_key', key.access_key);
    }
    if (_.isString(key.secret_key) && !_.isEmpty(key.secret_key)) {
      _.set(params, 'secret_key', key.secret_key);
    }
    if (_.isString(key.user) && !_.isEmpty(key.user)) {
      _.set(params, 'subuser', key.generate_key);
    }
    if (_.isBoolean(key.generate_key) && key.generate_key) {
      _.set(params, 'generate_key', key.generate_key);
      params = _.omit(params, ['access_key', 'secret_key']);
    }
    return new HttpParams({ fromObject: params });
  }

  private quota2Params(quota: Quota) {
    const params: Record<string, any> = {};
    if (_.isString(quota.type)) {
      _.set(params, 'quota_type', quota.type);
    }
    if (_.isBoolean(quota.enabled)) {
      _.set(params, 'enabled', quota.enabled);
    }
    if (_.isNumber(quota.max_size)) {
      _.set(params, 'max_size', quota.max_size);
    }
    if (_.isNumber(quota.max_objects)) {
      _.set(params, 'max_objects', quota.max_objects);
    }
    return new HttpParams({ fromObject: params });
  }
}
