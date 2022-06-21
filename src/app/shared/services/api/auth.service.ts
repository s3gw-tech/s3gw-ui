/* eslint-disable @typescript-eslint/naming-convention */
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { finalize, tap } from 'rxjs/operators';

import { AuthStorageService } from '~/app/shared/services/auth-storage.service';

export type LoginReply = {
  accessKey: string;
  secretKey: string;
};

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private url = 'api/auth';

  constructor(private http: HttpClient, private authStorageService: AuthStorageService) {}

  public login(accessKey: string, secretKey: string): Observable<LoginReply> {
    // ToDo...
    // const body = new HttpParams().set('accessKey', accessKey).set('secretKey', secretKey);
    // const headers = new HttpHeaders({});
    // return this.http.post<LoginReply>(`${this.url}/login`, body, { headers }).pipe(
    return of({ accessKey, secretKey }).pipe(
      tap((resp: LoginReply) => {
        this.authStorageService.set(accessKey, secretKey);
      })
    );
  }

  logout(): Observable<void> {
    // ToDo...
    // return this.http.post<void>(`${this.url}/logout`, null).pipe(
    //   finalize(() => {
    //     this.authStorageService.revoke();
    //     document.location.replace('');
    //   })
    // );
    return of().pipe(
      finalize(() => {
        this.authStorageService.revoke();
        document.location.replace('');
      })
    );
  }
}
