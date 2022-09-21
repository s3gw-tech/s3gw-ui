import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import * as _ from 'lodash';
import { Observable } from 'rxjs';

import { sign } from '~/app/aws2';
import { Credentials } from '~/app/shared/services/auth-storage.service';

type RgwServiceConfig = {
  url: string;
};

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
  private url = '';

  constructor(private http: HttpClient) {
    // Try to load the configuration file containing the information
    // to access the RGW.
    this.http
      .get<RgwServiceConfig>('/assets/rgw_service.config.json', {
        headers: {
          /* eslint-disable @typescript-eslint/naming-convention */
          'Cache-Control': 'no-cache',
          Pragma: 'no-cache'
        }
      })
      .subscribe({
        next: (config: RgwServiceConfig) => {
          if (config.url !== '$RGW_SERVICE_URL') {
            this.url = config.url;
          }
        },
        error: (err) => {
          err.preventDefault();
        }
      });
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
      })
    };
    sign(opts, options.credentials.accessKey!, options.credentials.secretKey!);
    return opts['headers'];
  }
}
