import { Injectable } from '@angular/core';
import * as _ from 'lodash';

import { AuthSessionService } from './auth-session.service';

@Injectable({
  providedIn: 'root'
})
export class UserLocalStorageService {
  constructor(private authStorageService: AuthSessionService) {}

  get(key: string, defaultValue?: any): string | null {
    const userId = this.authStorageService.getUserId();
    const value = localStorage.getItem(`${userId}@${key}`);
    return _.defaultTo(value, defaultValue);
  }

  set(key: string, value: string): void {
    const userId = this.authStorageService.getUserId();
    localStorage.setItem(`${userId}@${key}`, value);
  }
}
