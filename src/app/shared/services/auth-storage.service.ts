import { Injectable } from '@angular/core';
import * as _ from 'lodash';

import { Credentials } from '~/app/shared/models/credentials.type';

@Injectable({
  providedIn: 'root'
})
export class AuthStorageService {
  constructor() {}

  /**
   * Store various authentication related information in session storage.
   *
   * @param userId The ID of the current user.
   * @param accessKey The access key of the current user.
   * @param secretKey The secret key of the current user.
   *   This is required to sign AdminOps API request.
   */
  set(userId: string, accessKey: string, secretKey: string): void {
    sessionStorage.setItem('userId', userId);
    sessionStorage.setItem('accessKey', accessKey);
    sessionStorage.setItem('secretKey', secretKey);
  }

  getCredentials(): Credentials {
    return {
      accessKey: sessionStorage.getItem('accessKey'),
      secretKey: sessionStorage.getItem('secretKey')
    };
  }

  getUserId(): string | null {
    return sessionStorage.getItem('userId');
  }

  revoke(): void {
    sessionStorage.removeItem('userId');
    sessionStorage.removeItem('accessKey');
    sessionStorage.removeItem('secretKey');
  }

  isLoggedIn() {
    const credentials = this.getCredentials();
    return !_.isNull(credentials.accessKey);
  }
}
