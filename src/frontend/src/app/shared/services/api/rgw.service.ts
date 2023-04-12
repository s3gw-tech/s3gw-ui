import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import * as _ from 'lodash';
import { Observable } from 'rxjs';

import { sign } from '~/app/aws2';
import { Credentials } from '~/app/shared/models/credentials.type';
import { RgwServiceConfigService } from '~/app/shared/services/rgw-service-config.service';

export type RgwServiceRequestOptions = {
  credentials: Credentials;
  params?: HttpParams | { [param: string]: string | number | boolean };
  body?: any | null;
  headers?: Record<string, any>;
};

type BuildHeadersOptions = {
  url: string;
  method: 'GET' | 'PUT' | 'POST' | 'DELETE';
  credentials: Credentials;
  headers?: Record<string, any>;
};

@Injectable({
  providedIn: 'root'
})
export class RgwService {
  public url = '';

  constructor(private http: HttpClient, private rgwServiceConfigService: RgwServiceConfigService) {
    this.url = this.rgwServiceConfigService.config.url;
  }

  get<T>(url: string, options: RgwServiceRequestOptions): Observable<T> {
    const headers = this.buildHeaders({
      url,
      method: 'GET',
      credentials: options.credentials,
      headers: options.headers
    });
    return this.http.get<T>(this.buildUrl(url), { headers, params: options.params });
  }

  put<T>(url: string, options: RgwServiceRequestOptions): Observable<T> {
    const headers = this.buildHeaders({
      url,
      method: 'PUT',
      credentials: options.credentials,
      headers: options.headers
    });
    return this.http.put<T>(this.buildUrl(url), options.body, {
      headers,
      params: options.params
    });
  }

  post<T>(url: string, options: RgwServiceRequestOptions): Observable<T> {
    const headers = this.buildHeaders({
      url,
      method: 'POST',
      credentials: options.credentials,
      headers: options.headers
    });
    return this.http.post<T>(this.buildUrl(url), options.body, { headers, params: options.params });
  }

  delete<T>(url: string, options: RgwServiceRequestOptions): Observable<T> {
    const headers = this.buildHeaders({
      url,
      method: 'DELETE',
      credentials: options.credentials,
      headers: options.headers
    });
    return this.http.delete<T>(this.buildUrl(url), { headers, params: options.params });
  }

  private buildUrl(url: string) {
    return `${_.trimEnd(this.url, '/')}/${_.trimStart(url, '/')}`;
  }

  private buildHeaders(options: BuildHeadersOptions): Record<string, any> {
    const opts: Record<string, any> = {
      method: options.method,
      url: options.url,
      headers: _.merge(options.headers ?? {}, {
        /* eslint-disable @typescript-eslint/naming-convention */
        Accept: 'application/json',
        'Cache-Control': 'no-cache',
        Pragma: 'no-cache',
        'x-amz-date': new Date().toUTCString()
        /* eslint-enable @typescript-eslint/naming-convention */
      })
    };
    sign(opts, options.credentials.accessKey!, options.credentials.secretKey!);
    return opts['headers'];
  }
}
