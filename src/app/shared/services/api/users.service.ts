import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import * as _ from 'lodash';
import { Observable, of } from 'rxjs';
import { catchError, mapTo } from 'rxjs/operators';

export type User = {
  /* eslint-disable @typescript-eslint/naming-convention */
  uid: string;
  display_name: string;
  email: string;
  max_buckets: number;
  object_usage: number;
  size_usage: number;
  suspended: boolean;
};

@Injectable({
  providedIn: 'root'
})
export class UsersService {
  private url = 'api/users';

  constructor(private http: HttpClient) {}

  public list(): Observable<User[]> {
    // return this.http.get<User[]>(`${this.url}/`);
    return this.http.get<User[]>(`assets/fake-data/users.json`);
  }

  public create(user: User): Observable<void> {
    return this.http.post<void>(`${this.url}/create`, user);
  }

  public delete(uid: string): Observable<void> {
    return this.http.delete<void>(`${this.url}/${uid}`);
  }

  public update(user: Partial<User>): Observable<User> {
    return this.http.patch<User>(`${this.url}/${user.uid}`, user);
  }

  public get(uid: string): Observable<User> {
    return this.http.get<User>(`${this.url}/${uid}`);
  }

  public exists(username: string): Observable<boolean> {
    return this.get(username).pipe(
      mapTo(true),
      catchError((error) => {
        if (_.isFunction(error.preventDefault)) {
          error.preventDefault();
        }
        return of(false);
      })
    );
  }
}
