import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { EMPTY, Observable } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

export type HelpMenuItem = {
  title: string;
  url: string;
  icon: string;
};

export type AppConfig = {
  name: string;
  title: string;
  helpMenuItems: HelpMenuItem[];
};

@Injectable({
  providedIn: 'root'
})
export class AppConfigService {
  private _config: AppConfig = {
    name: 's3gw',
    title: 's3gw - Object Management',
    helpMenuItems: []
  };

  constructor(private http: HttpClient) {}

  get config(): AppConfig {
    // eslint-disable-next-line no-underscore-dangle
    return this._config;
  }

  public load(): Observable<AppConfig> {
    return this.http
      .get<Partial<AppConfig>>('assets/app.config.json', {
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
        tap((config: AppConfig) => {
          // eslint-disable-next-line no-underscore-dangle
          this._config = config;
        })
      );
  }
}
