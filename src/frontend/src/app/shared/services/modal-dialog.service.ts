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
   * Display a modal dialog used to delete things.
   *
   * @param objects The list of objects that are affected by the action.
   * @param question The singular and plural question.
   * @param callback The function that is executed if the confirmation
   *   was successful.
   */
  confirmDeletion<T>(
    objects: T[],
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
          objects.length > 1
            ? format(question.plural!, {
                count: objects.length
              })
            : format(question.singular!, question.singularFmtArgs!(objects[0]))
      } as ModalConfig
    );
  }

  /**
   * Display a modal form dialog used to delete objects. The form
   * contains a checkbox which will delete all versions of an object
   * if enabled. If disabled, only the latest version is deleted.
   *
   * @param isBucketVersioned Is the bucket versioned?
   * @param objects The list of objects that are affected by the action.
   * @param question The singular and plural question.
   * @param callback The function that is executed if the confirmation
   *   was successful.
   */
  confirmObjectDeletion<T>(
    isBucketVersioned: boolean,
    objects: T[],
    question: {
      singular?: string;
      singularFmtArgs?: (value: T) => Record<any, any>;
      plural?: string;
    },
    callback: (deep: boolean) => void
  ): NgbModalRef {
    if (!isBucketVersioned) {
      return this.confirmDeletion(objects, question, () => callback(false));
    }
    _.defaults(question, {
      singular: TEXT('Do you really want to delete the item?'),
      singularFmtArgs: () => ({}),
      plural: TEXT('Do you really want to delete these <strong>{{ count }}</strong> items?')
    });
    return this.dialogService.open(
      DeclarativeFormModalComponent,
      (res: DeclarativeFormValues | false) => {
        if (res !== false) {
          callback(res['deep']);
        }
      },
      {
        subtitleIconClass: `${this.icons.danger} s3gw-color-danger`,
        subtitle:
          objects.length > 1
            ? format(question.plural!, {
                count: objects.length
              })
            : format(question.singular!, question.singularFmtArgs!(objects[0])),
        submitButtonText: TEXT('Yes'),
        submitButtonResult: undefined,
        submitButtonClass: 'btn-danger',
        cancelButtonText: TEXT('No'),
        cancelButtonResult: false,
        formConfig: {
          fields: [
            {
              type: 'checkbox',
              name: 'deep',
              label: TEXT('Delete all versions'),
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
