import { Injectable } from '@angular/core';
import { CanDeactivate } from '@angular/router';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { marker as TEXT } from '@ngneat/transloco-keys-manager/marker';
import * as _ from 'lodash';
import { Observable } from 'rxjs';

import { IsDirty } from '~/app/shared/models/is-dirty.interface';
import { ModalDialogService } from '~/app/shared/services/modal-dialog.service';
@Injectable({
  providedIn: 'root'
})
export class IsDirtyGuardService implements CanDeactivate<IsDirty> {
  constructor(private modalDialogService: ModalDialogService) {}

  canDeactivate(
    component: IsDirty,
    currentRoute: ActivatedRouteSnapshot,
    currentState: RouterStateSnapshot,
    nextState?: RouterStateSnapshot
  ): Observable<boolean> | Promise<boolean> | boolean {
    return !_.isFunction(component.isDirty)
      ? true
      : component.isDirty()
      ? this.showConfirmationDialog()
      : true;
  }

  private showConfirmationDialog(): Observable<boolean> {
    const modalRef = this.modalDialogService.yesNoDanger(
      TEXT(
        'You have made changes that have not been saved yet. Do you want to discard these changes?'
      )
    );
    return modalRef.closed;
  }
}
