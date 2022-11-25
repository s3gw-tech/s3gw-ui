import { Injectable } from '@angular/core';
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
   * Display a modal confirmation dialog.
   *
   * @param objects The list of objects that are affected by the action.
   * @param severity The severity of the question.
   * @param question The singular and plural question.
   * @param callback The function that is executed if the confirmation
   *   was successful.
   */
  confirmation<T>(
    objects: T[],
    severity: 'info' | 'warning' | 'danger' | 'question' = 'question',
    question: {
      singular?: string;
      singularFmtArgs?: (value: T) => Record<any, any>;
      plural?: string;
    },
    callback: () => void
  ): void {
    _.defaults(question, {
      singular: TEXT('Do you really want to delete the item?'),
      singularFmtArgs: () => ({}),
      plural: TEXT('Do you really want to delete these <strong>{{ count }}</strong> items?')
    });
    this.dialogService.open(
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
}
