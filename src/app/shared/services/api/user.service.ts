import { HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import * as _ from 'lodash';
import { forkJoin, Observable, of } from 'rxjs';
import { mergeMap } from 'rxjs/operators';

import { RgwAdminOpsService } from '~/app/shared/services/api/rgw-admin-ops.service';
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
  keys: UserKey[];
};

export type UserKey = {
  /* eslint-disable @typescript-eslint/naming-convention */
  access_key?: string;
  secret_key?: string;
  user?: string;
  generate_key?: boolean;
};

export type UserList = {
  count: number;
  keys: string[];
  truncated: boolean;
  marker?: number;
};

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private url = 'admin/user';

  constructor(
    private authStorageService: AuthStorageService,
    private rgwAdminOpsService: RgwAdminOpsService
  ) {}

  public list(): Observable<User[]> {
    const credentials = this.authStorageService.getCredentials();
    return this.rgwAdminOpsService.get<UserList>(`${this.url}?list`, { credentials }).pipe(
      mergeMap((userList: UserList) => {
        if (userList.keys.length > 0) {
          return forkJoin(userList.keys.map((uid: string) => this.get(uid)));
        }
        return of([]);
      })
    );
  }

  /**
   * https://docs.ceph.com/en/latest/radosgw/adminops/#create-user
   */
  public create(user: User): Observable<void> {
    const credentials = this.authStorageService.getCredentials();
    const params = this.user2Params(user);
    return this.rgwAdminOpsService.put<void>(this.url, { credentials, params });
  }

  /**
   * https://docs.ceph.com/en/latest/radosgw/adminops/#remove-user
   */
  public delete(uid: string): Observable<void> {
    const credentials = this.authStorageService.getCredentials();
    const params = { uid };
    return this.rgwAdminOpsService.delete<void>(this.url, { credentials, params });
  }

  /**
   * https://docs.ceph.com/en/latest/radosgw/adminops/#modify-user
   */
  public update(user: Partial<User>): Observable<User> {
    const credentials = this.authStorageService.getCredentials();
    const params = this.user2Params(user);
    return this.rgwAdminOpsService.post<User>(this.url, { credentials, params });
  }

  /**
   * https://docs.ceph.com/en/latest/radosgw/adminops/#get-user-info
   */
  public get(uid: string): Observable<User> {
    const credentials = this.authStorageService.getCredentials();
    const params = { uid };
    return this.rgwAdminOpsService.get<User>(this.url, { credentials, params });
  }

  /**
   * https://docs.ceph.com/en/latest/radosgw/adminops/#create-key
   */
  public createKey(uid: string, key: UserKey): Observable<void> {
    const credentials = this.authStorageService.getCredentials();
    const params = this.key2Params(uid, key);
    return this.rgwAdminOpsService.put<void>(`${this.url}?key`, { credentials, params });
  }

  /**
   * https://docs.ceph.com/en/latest/radosgw/adminops/#remove-key
   */
  public deleteKey(uid: string, accessKey: string): Observable<void> {
    const credentials = this.authStorageService.getCredentials();
    const params = new HttpParams({
      fromObject: { uid, 'access-key': accessKey }
    });
    return this.rgwAdminOpsService.delete<void>(`${this.url}?key`, { credentials, params });
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

  private key2Params(uid: string, key: UserKey): HttpParams {
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
}
