import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { EMPTY, Observable } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

type RgwServiceConfig = {
  url: string;
};

@Injectable({
  providedIn: 'root'
})
export class RgwServiceConfigService {
  private _config: RgwServiceConfig = { url: '' };

  constructor(private http: HttpClient) {}

  get config(): RgwServiceConfig {
    // eslint-disable-next-line no-underscore-dangle
    return this._config;
  }

  public load(): Observable<RgwServiceConfig> {
    // Try to load the configuration file containing the information
    // to access the RGW.
    return this.http
      .get<RgwServiceConfig>('assets/rgw_service.config.json', {
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
        tap((config: RgwServiceConfig) => {
          // Make sure the environment variable has been replaced by a real URL.
          if (config.url !== '$RGW_SERVICE_URL') {
            // eslint-disable-next-line no-underscore-dangle
            this._config.url = config.url;
          }
        })
      );
  }
}
