import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { sign } from '~/app/aws2';
import { Credentials } from '~/app/shared/services/auth-storage.service';

type RgwAdminOpsConfig = {
  host: string;
};

export type RgwAdminOpsRequestOptions = {
  credentials: Credentials;
  params?: HttpParams | { [param: string]: string | number | boolean };
};

@Injectable({
  providedIn: 'root'
})
export class RgwAdminOpsService {
  private host = '';

  constructor(private http: HttpClient) {
    // Try to load the configuration file containing the information to
    // access the RGW AdminOps API.
    this.http.get<RgwAdminOpsConfig>('/assets/rgw_admin_ops.config.json').subscribe({
      next: (config: RgwAdminOpsConfig) => {
        if (config.host !== '$S3GW_RGW_ADMINOPS_HOST') {
          this.host = config.host;
        }
      },
      error: (err) => {
        err.preventDefault();
      }
    });
  }

  get<T>(url: string, options: RgwAdminOpsRequestOptions): Observable<T> {
    const headers = this.buildHeaders(url, 'GET', options.credentials);
    return this.http.get<T>(this.buildUrl(url), { headers, params: options.params });
  }

  put<T>(url: string, options: RgwAdminOpsRequestOptions): Observable<T> {
    const headers = this.buildHeaders(url, 'PUT', options.credentials);
    return this.http.put<T>(this.buildUrl(url), null, { headers, params: options.params });
  }

  post<T>(url: string, options: RgwAdminOpsRequestOptions): Observable<T> {
    const headers = this.buildHeaders(url, 'POST', options.credentials);
    return this.http.post<T>(this.buildUrl(url), null, { headers, params: options.params });
  }

  delete<T>(url: string, options: RgwAdminOpsRequestOptions): Observable<T> {
    const headers = this.buildHeaders(url, 'DELETE', options.credentials);
    return this.http.delete<T>(this.buildUrl(url), { headers, params: options.params });
  }

  private buildUrl(url: string) {
    return `${this.host}/${url}`;
  }

  private buildHeaders(url: string, method: string, credentials: Credentials) {
    const opts: Record<string, any> = {
      method,
      url,
      headers: {
        /* eslint-disable @typescript-eslint/naming-convention */
        'x-amz-date': new Date().toUTCString()
      }
    };
    sign(opts, credentials.accessKey!, credentials.secretKey!);
    return opts['headers'];
  }
}
