import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

export type S3gwConfig = {
  apiUrl: string;
  delimiter: string;
  url: string;
};

@Injectable({
  providedIn: 'root'
})
export class S3gwConfigService {
  private _config: S3gwConfig = { apiUrl: '', delimiter: '/', url: '' };

  constructor(private http: HttpClient) {}

  get config(): S3gwConfig {
    // eslint-disable-next-line no-underscore-dangle
    return this._config;
  }

  /**
   * Load the configuration file.
   */
  public load(): Observable<S3gwConfig> {
    // Try to load the configuration file containing the information
    // to access the RGW.

    // eslint-disable-next-line no-underscore-dangle
    this._config.apiUrl = 'api/';
    return of(this.config);
  }

  /**
   * Check whether the configuration is valid.
   */
  public isValid(): boolean {
    // At the moment it is enough to check if the URL is empty.
    return this.config.apiUrl !== '';
  }
}
