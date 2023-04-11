import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import * as _ from 'lodash';
import { EMPTY, Observable } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

type RgwServiceConfig = {
  url: string;
  delimiter: string;
};

@Injectable({
  providedIn: 'root'
})
export class RgwServiceConfigService {
  private _config: RgwServiceConfig = { url: '', delimiter: '/' };

  constructor(private http: HttpClient) {}

  get config(): RgwServiceConfig {
    // eslint-disable-next-line no-underscore-dangle
    return this._config;
  }

  /**
   * Load the configuration file.
   */
  public load(): Observable<RgwServiceConfig> {
    // Try to load the configuration file containing the information
    // to access the RGW.
    return this.http
      .get<Partial<RgwServiceConfig>>('assets/rgw_service.config.json', {
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
        map((config: Partial<RgwServiceConfig>) => {
          // Make sure the environment variable has been replaced by a real URL.
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
    return this.config.url !== '';
  }
}
