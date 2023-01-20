import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import * as _ from 'lodash';

import { Credentials } from '~/app/shared/models/credentials.type';

@Injectable({
  providedIn: 'root'
})
export class AuthSessionService {
  constructor(private router: Router) {}

  /**
   * Store various authentication related information in session storage.
   *
   * @param userId The ID of the current user.
   * @param accessKey The access key of the current user.
   * @param secretKey The secret key of the current user.
   *   This is required to sign AdminOps API request.
   * @param isAdmin Whether or not the user has administrator
   *   privileges. Defaults to `false`.
   */
  set(userId: string, accessKey: string, secretKey: string, isAdmin: boolean = false): void {
    sessionStorage.setItem('userId', userId);
    sessionStorage.setItem('accessKey', accessKey);
    sessionStorage.setItem('secretKey', secretKey);
    sessionStorage.setItem('isAdmin', isAdmin ? 'yes' : 'no');
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
    sessionStorage.removeItem('isAdmin');
  }

  isLoggedIn(): boolean {
    const credentials = this.getCredentials();
    return !_.isNull(credentials.accessKey);
  }

  isAdmin(): boolean {
    return sessionStorage.getItem('isAdmin') === 'yes';
  }

  logout(): void {
    this.revoke();
    this.router.navigate(['/login']);
  }
}
