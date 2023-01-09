/* eslint-disable @typescript-eslint/member-ordering */
import { Component, forwardRef } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { marker as TEXT } from '@ngneat/transloco-keys-manager/marker';
import * as AWS from 'aws-sdk';
import * as _ from 'lodash';

import { DeclarativeFormModalComponent } from '~/app/shared/components/declarative-form-modal/declarative-form-modal.component';
import { Icon } from '~/app/shared/enum/icon.enum';
import { DeclarativeFormModalConfig } from '~/app/shared/models/declarative-form-modal-config.type';
import { DialogService } from '~/app/shared/services/dialog.service';

@Component({
  selector: 's3gw-tags-input',
  templateUrl: './tags-input.component.html',
  styleUrls: ['./tags-input.component.scss'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => TagsInputComponent),
      multi: true
    }
  ]
})
export class TagsInputComponent implements ControlValueAccessor {
  public icons = Icon;
  public disabled = false;

  private _value: AWS.S3.Types.TagSet = [];
  private onChange = (_value: any) => {};
  private onTouched = () => {};

  constructor(private dialogService: DialogService) {}

  get value(): AWS.S3.Types.TagSet {
    // eslint-disable-next-line no-underscore-dangle
    return _.sortBy(this._value, ['Key']);
  }
  set value(value: AWS.S3.Types.TagSet) {
    // eslint-disable-next-line no-underscore-dangle
    this._value = value;
  }

  writeValue(value: any) {
    this.value = value;
  }

  registerOnChange(fn: (value: any) => any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => any): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  addTag(): void {
    // @see https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-tagging.html
    this.dialogService.open(
      DeclarativeFormModalComponent,
      (result: AWS.S3.Types.Tag | false) => {
        if (result !== false) {
          const newValue: AWS.S3.Types.TagSet = _.reject(this.value, ['Key', result.Key]);
          newValue.push(result);
          this.value = newValue;
          this.onChange(this.value);
          this.onTouched();
        }
      },
      {
        formConfig: {
          title: TEXT('Add Tag'),
          fields: [
            {
              type: 'text',
              name: 'Key',
              label: TEXT('Key'),
              value: '',
              validators: {
                required: true,
                maxLength: 128
              }
            },
            {
              type: 'text',
              name: 'Value',
              label: TEXT('Value'),
              value: '',
              validators: {
                required: true,
                maxLength: 256
              }
            }
          ]
        }
      } as DeclarativeFormModalConfig
    );
  }

  removeTag(tag: AWS.S3.Types.Tag): void {
    this.value = _.reject(this.value, { ...tag });
    this.onChange(this.value);
    this.onTouched();
  }
}
