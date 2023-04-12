import { Component, Inject, ViewChild } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { marker as TEXT } from '@ngneat/transloco-keys-manager/marker';
import * as _ from 'lodash';

import { DeclarativeFormComponent } from '~/app/shared/components/declarative-form/declarative-form.component';
import { DeclarativeFormModalConfig } from '~/app/shared/models/declarative-form-modal-config.type';
import { S3GW_MODAL_DATA } from '~/app/shared/services/dialog.service';

@Component({
  selector: 's3gw-declarative-form-modal',
  templateUrl: './declarative-form-modal.component.html',
  styleUrls: ['./declarative-form-modal.component.scss']
})
export class DeclarativeFormModalComponent {
  @ViewChild(DeclarativeFormComponent, { static: true })
  form!: DeclarativeFormComponent;

  public config: DeclarativeFormModalConfig;

  constructor(
    public ngbActiveModal: NgbActiveModal,
    @Inject(S3GW_MODAL_DATA) config: DeclarativeFormModalConfig
  ) {
    this.config = _.defaultsDeep(config, {
      formConfig: {
        fields: []
      },
      submitButtonVisible: true,
      submitButtonText: TEXT('OK'),
      submitButtonResult: undefined,
      cancelButtonVisible: true,
      cancelButtonText: TEXT('Cancel'),
      cancelButtonResult: false
    });
  }

  onCancel(): void {
    this.ngbActiveModal.close(this.config.cancelButtonResult);
  }

  onSubmit(): void {
    const result = _.isUndefined(this.config.submitButtonResult)
      ? this.form.values
      : this.config.submitButtonResult;
    this.ngbActiveModal.close(result);
  }
}
