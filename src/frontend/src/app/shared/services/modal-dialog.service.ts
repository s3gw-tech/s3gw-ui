import { Injectable } from '@angular/core';
import { NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { marker as TEXT } from '@ngneat/transloco-keys-manager/marker';
import * as _ from 'lodash';

import { format } from '~/app/functions.helper';
import { DeclarativeFormModalComponent } from '~/app/shared/components/declarative-form-modal/declarative-form-modal.component';
import { ModalComponent, ModalConfig } from '~/app/shared/components/modal/modal.component';
import { Icon } from '~/app/shared/enum/icon.enum';
import { DeclarativeFormValues } from '~/app/shared/models/declarative-form-config.type';
import { DeclarativeFormModalConfig } from '~/app/shared/models/declarative-form-modal-config.type';
import { DialogService } from '~/app/shared/services/dialog.service';

@Injectable({
  providedIn: 'root'
})
export class ModalDialogService {
  private icons = Icon;

  constructor(private dialogService: DialogService) {}

  /**
   * Display a modal dialog used to delete items.
   *
   * @param objects The list of objects that are affected by the action.
   * @param question The singular and plural question.
   * @param callback The function that is executed if the confirmation
   *   was successful.
   */
  confirmDeletion<T>(
    items: T[],
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
        severity: 'danger',
        message:
          items.length > 1
            ? format(question.plural!, {
                count: items.length
              })
            : format(question.singular!, question.singularFmtArgs!(items[0]))
      } as ModalConfig
    );
  }

  /**
   * Display a modal dialog used to delete items. A checkbox is displayed
   * as well with which an additional action can be activated or
   * deactivated.
   *
   * @param items The list of items that are affected by the action.
   * @param question The singular and plural question.
   * @param callback The function that is executed if the confirmation
   *   was successful.
   */
  confirmDeletionEx<T>(
    items: T[],
    question: {
      singular?: string;
      singularFmtArgs?: (value: T) => Record<any, any>;
      plural?: string;
      checkbox?: string;
    },
    callback: (checked: boolean) => void
  ): NgbModalRef {
    _.defaults(question, {
      singular: TEXT('Do you really want to delete the item?'),
      singularFmtArgs: () => ({}),
      plural: TEXT('Do you really want to delete these <strong>{{ count }}</strong> items?'),
      checkbox: TEXT('Force deletion')
    });
    return this.dialogService.open(
      DeclarativeFormModalComponent,
      (res: DeclarativeFormValues | false) => {
        if (res !== false) {
          callback(res['checked']);
        }
      },
      {
        subtitleIconClass: `${this.icons.danger} s3gw-color-danger`,
        subtitle:
          items.length > 1
            ? format(question.plural!, {
                count: items.length
              })
            : format(question.singular!, question.singularFmtArgs!(items[0])),
        submitButtonText: TEXT('Yes'),
        submitButtonResult: undefined,
        submitButtonClass: 'btn-danger',
        cancelButtonText: TEXT('No'),
        cancelButtonResult: false,
        formConfig: {
          fields: [
            {
              type: 'checkbox',
              name: 'checked',
              label: question.checkbox,
              value: false
            }
          ]
        }
      } as DeclarativeFormModalConfig
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
