import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { sign } from '~/app/aws2';
import { Credentials } from '~/app/shared/services/auth-storage.service';

export type RgwAdminOpsRequestOptions = {
  credentials: Credentials;
  params?: HttpParams | { [param: string]: string | number | boolean };
};

@Injectable({
  providedIn: 'root'
})
export class RgwAdminOpsService {
  private host = '127.0.0.1:7480';

  constructor(private http: HttpClient) {}

  get<T>(url: string, options: RgwAdminOpsRequestOptions): Observable<T> {
    const headers = this.buildHeaders(url, 'GET', options.credentials);
    return this.http.get<T>(url, { headers, params: options.params });
  }

  put<T>(url: string, options: RgwAdminOpsRequestOptions): Observable<T> {
    const headers = this.buildHeaders(url, 'PUT', options.credentials);
    return this.http.put<T>(url, null, { headers, params: options.params });
  }

  post<T>(url: string, options: RgwAdminOpsRequestOptions): Observable<T> {
    const headers = this.buildHeaders(url, 'POST', options.credentials);
    return this.http.post<T>(url, null, { headers, params: options.params });
  }

  delete<T>(url: string, options: RgwAdminOpsRequestOptions): Observable<T> {
    const headers = this.buildHeaders(url, 'DELETE', options.credentials);
    return this.http.delete<T>(url, { headers, params: options.params });
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
