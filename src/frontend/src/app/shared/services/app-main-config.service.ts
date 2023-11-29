import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import * as _ from 'lodash';
import { EMPTY, Observable } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

export type AppMainConfig = {
  /* eslint-disable @typescript-eslint/naming-convention */
  ApiPath: string;
  Delimiter: string;
  Endpoint: string;
  InstanceId: string;
  /* eslint-enable @typescript-eslint/naming-convention */
};

@Injectable({
  providedIn: 'root'
})
export class AppMainConfigService {
  private _config: AppMainConfig = {
    /* eslint-disable @typescript-eslint/naming-convention */
    ApiPath: 'api',
    Delimiter: '/',
    Endpoint: '',
    InstanceId: ''
    /* eslint-enable @typescript-eslint/naming-convention */
  };

  constructor(private http: HttpClient) {}

  get config(): AppMainConfig {
    // eslint-disable-next-line no-underscore-dangle
    return this._config;
  }

  public load(): Observable<AppMainConfig> {
    return this.http
      .get<Partial<AppMainConfig>>('assets/app-main.config.json', {
        headers: {
          /* eslint-disable @typescript-eslint/naming-convention */
          'Cache-Control': 'no-cache',
          Pragma: 'no-cache'
          /* eslint-enable @typescript-eslint/naming-convention */
        }
      })
      .pipe(
        // @ts-ignore
        catchError((err) => {
          err.preventDefault?.();
          return EMPTY;
        }),
        tap((config: AppMainConfig) => {
          // Make sure the `ApiPath` is in a valid form, so it can be
          // used without worries and adjustments.
          config.ApiPath = _.trim(config.ApiPath, '/');
          // eslint-disable-next-line no-underscore-dangle
          this._config = config;
        })
      );
  }
}
