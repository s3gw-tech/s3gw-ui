import { Observable } from 'rxjs';

export interface IsDirty {
  isDirty: () => Observable<boolean> | Promise<boolean> | boolean;
}
