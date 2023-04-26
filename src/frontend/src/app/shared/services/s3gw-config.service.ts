import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import * as _ from 'lodash';
import { EMPTY, Observable } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

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
    return this.http
      .get<Partial<S3gwConfig>>('assets/rgw_service.config.json', {
        headers: {
          /* eslint-disable @typescript-eslint/naming-convention */
          'Cache-Control': 'no-cache',
          Pragma: 'no-cache'
          /* eslint-enable @typescript-eslint/naming-convention */
        }
      })
      .pipe(
        catchError((err) => {
          err.preventDefault?.();
          return EMPTY;
        }),
        map((config: Partial<S3gwConfig>) => {
          // Make sure the environment variables have been replaced by real URLs.
          if (config?.apiUrl === '$S3GW_UI_API_URL') {
            config.apiUrl = 'api/'; // Reset to default value.
          }
          if (config?.url === '$RGW_SERVICE_URL') {
            config.url = ''; // Reset to default value.
          }
          // eslint-disable-next-line no-underscore-dangle
          return _.merge(this._config, config);
        })
      );
  }

  /**
   * Check whether the configuration is valid.
   */
  public isValid(): boolean {
    // At the moment it is enough to check if the URL is empty.
    return this.config.apiUrl !== '' && this.config.url !== '';
  }
}
