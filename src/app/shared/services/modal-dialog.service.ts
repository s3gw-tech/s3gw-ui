import { Injectable } from '@angular/core';
import { NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { marker as TEXT } from '@ngneat/transloco-keys-manager/marker';
import * as _ from 'lodash';

import { format } from '~/app/functions.helper';
import { ModalComponent, ModalConfig } from '~/app/shared/components/modal/modal.component';
import { DialogService } from '~/app/shared/services/dialog.service';

@Injectable({
  providedIn: 'root'
})
export class ModalDialogService {
  constructor(private dialogService: DialogService) {}

  /**
   * Display of a modal dialog used to delete things.
   *
   * @param objects The list of objects that are affected by the action.
   * @param severity The severity of the question.
   * @param question The singular and plural question.
   * @param callback The function that is executed if the confirmation
   *   was successful.
   */
  confirmDeletion<T>(
    objects: T[],
    severity: 'info' | 'warning' | 'danger' | 'question' = 'question',
    question: {
      singular?: string;
      singularFmtArgs?: (value: T) => Record<any, any>;
      plural?: string;
    },
    callback: () => void
  ): NgbModalRef {
    _.defaults(question, {
      singular: TEXT('Do you really want to delete the item?'),
      singularFmtArgs: () => ({}),
      plural: TEXT('Do you really want to delete these <strong>{{ count }}</strong> items?')
    });
    return this.dialogService.open(
      ModalComponent,
      (res: boolean) => {
        if (res === true) {
          callback();
        }
      },
      {
        type: 'yesNo',
        severity,
        message:
          objects.length > 1
            ? format(question.plural!, {
                count: objects.length
              })
            : format(question.singular!, question.singularFmtArgs!(objects[0]))
      } as ModalConfig
    );
  }

  /**
   * Display a simple `Yes` or `No` modal dialog.
   *
   * @param message The message to be shown.
   * @param callback The function that is executed after the dialog
   *  has been confirmed.
   */
  yesNo(message: string, callback?: (result: boolean) => void): NgbModalRef {
    return this.dialogService.open(ModalComponent, callback, {
      type: 'yesNo',
      severity: 'question',
      message
    } as ModalConfig);
  }

  /**
   * Display a simple `Yes` or `No` modal dialog with the severity `Danger`.
   *
   * @param message The message to be shown.
   * @param callback The function that is executed after the dialog
   *  has been confirmed.
   */
  yesNoDanger(message: string, callback?: (result: boolean) => void): NgbModalRef {
    return this.dialogService.open(ModalComponent, callback, {
      type: 'yesNo',
      severity: 'danger',
      message
    } as ModalConfig);
  }
}
