import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import * as _ from 'lodash';
import { forkJoin, Observable, of } from 'rxjs';
import { catchError, mapTo, mergeMap } from 'rxjs/operators';

import { sign } from '~/app/aws2';
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
  access_key: string;
  secret_key: string;
  user: string;
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
class RGWAdminOPSHttpClient {
  private host = '127.0.0.1:7480';

  constructor(private authStorageService: AuthStorageService, private http: HttpClient) {}

  get<T>(url: string, params?: HttpParams): Observable<T> {
    const headers = this.buildHeaders(url, 'GET');
    return this.http.get<T>(url, { headers, params });
  }

  put<T>(url: string, params?: HttpParams): Observable<T> {
    const headers = this.buildHeaders(url, 'PUT');
    return this.http.put<T>(url, null, { headers, params });
  }

  post<T>(url: string, params?: HttpParams): Observable<T> {
    const headers = this.buildHeaders(url, 'POST');
    return this.http.post<T>(url, null, { headers, params });
  }

  delete<T>(url: string, params?: HttpParams): Observable<T> {
    const headers = this.buildHeaders(url, 'DELETE');
    return this.http.delete<T>(url, { headers, params });
  }

  patch<T>(url: string, body: any | null): Observable<T> {
    return this.http.patch<T>(url, body);
  }

  private buildHeaders(url: string, method: string) {
    const credentials = this.authStorageService.getCredentials();
    const opts: Record<string, any> = {
      method,
      url,
      headers: {
        'x-amz-date': new Date().toUTCString()
      }
    };
    sign(opts, credentials.accessKey!, credentials.secretKey!);
    return opts['headers'];
  }
}

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private url = 'admin/user';

  constructor(private http: RGWAdminOPSHttpClient) {}

  public list(): Observable<User[]> {
    return this.http.get<UserList>(`${this.url}?list`).pipe(
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
    const params = this.user2Params(user);
    return this.http.put<void>(this.url, params);
  }

  /**
   * https://docs.ceph.com/en/latest/radosgw/adminops/#remove-user
   */
  public delete(uid: string): Observable<void> {
    const params = new HttpParams({
      fromObject: { uid }
    });
    return this.http.delete<void>(this.url, params);
  }

  /**
   * https://docs.ceph.com/en/latest/radosgw/adminops/#modify-user
   */
  public update(user: Partial<User>): Observable<User> {
    const params = this.user2Params(user);
    return this.http.post<User>(this.url, params);
  }

  /**
   * https://docs.ceph.com/en/latest/radosgw/adminops/#get-user-info
   */
  public get(
    uid?: string | null,
    accessKey?: string | null,
    stats = false,
    sync = false
  ): Observable<User> {
    const params: Record<string, any> = { stats, sync };
    if (_.isString(uid) && !_.isEmpty(uid)) {
      _.set(params, 'uid', uid);
    }
    if (_.isString(accessKey) && !_.isEmpty(accessKey)) {
      _.set(params, 'access-key', accessKey);
    }
    return this.http.get<User>(this.url, new HttpParams({ fromObject: params }));
  }

  public exists(uid: string): Observable<boolean> {
    return this.get(uid).pipe(
      mapTo(true),
      catchError((error) => {
        if (_.isFunction(error.preventDefault)) {
          error.preventDefault();
        }
        return of(false);
      })
    );
  }

  /**
   * https://docs.ceph.com/en/latest/radosgw/adminops/#create-key
   */
  public createKey(uid: string, key: UserKey): Observable<void> {
    const params = new HttpParams({
      fromObject: {
        uid,
        'access-key': key.access_key,
        'secret-key': key.secret_key
      }
    });
    return this.http.put<void>(`${this.url}?key`, params);
  }

  /**
   * https://docs.ceph.com/en/latest/radosgw/adminops/#remove-key
   */
  public deleteKey(uid: string, accessKey: string): Observable<void> {
    const params = new HttpParams({
      fromObject: { uid, 'access-key': accessKey }
    });
    return this.http.delete<void>(`${this.url}?key`, params);
  }

  private user2Params(user: Partial<User>) {
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
}
