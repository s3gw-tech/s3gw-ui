import { Injectable } from '@angular/core';

export type S3gwConfig = {
  apiUrl: string;
  delimiter: string;
};

@Injectable({
  providedIn: 'root'
})
export class S3gwConfigService {
  private _config: S3gwConfig = { apiUrl: 'api/', delimiter: '/' };

  constructor() {}

  get config(): S3gwConfig {
    // eslint-disable-next-line no-underscore-dangle
    return this._config;
  }
}
