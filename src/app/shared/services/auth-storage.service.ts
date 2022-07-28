import { Injectable } from '@angular/core';
import * as _ from 'lodash';

export type Credentials = {
  accessKey: string | null;
  secretKey: string | null;
};

@Injectable({
  providedIn: 'root'
})
export class AuthStorageService {
  constructor() {}

  set(userId: string, accessKey: string, secretKey: string): void {
    localStorage.setItem('userId', userId);
    localStorage.setItem('accessKey', accessKey);
    localStorage.setItem('secretKey', secretKey);
  }

  getCredentials(): Credentials {
    return {
      accessKey: localStorage.getItem('accessKey'),
      secretKey: localStorage.getItem('secretKey')
    };
  }

  getUserId(): string | null {
    return localStorage.getItem('accessKey');
  }

  revoke(): void {
    localStorage.removeItem('userId');
    localStorage.removeItem('secretKey');
  }

  isLoggedIn() {
    const credentials = this.getCredentials();
    return !_.isNull(credentials.accessKey);
  }
}
