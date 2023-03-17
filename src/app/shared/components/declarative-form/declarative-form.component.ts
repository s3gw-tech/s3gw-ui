import { Clipboard } from '@angular/cdk/clipboard';
import { AfterViewInit, Component, Input, OnDestroy, OnInit } from '@angular/core';
import {
  AbstractControl,
  AsyncValidatorFn,
  FormBuilder,
  FormControl,
  FormGroup,
  FormGroupDirective,
  ValidatorFn,
  Validators
} from '@angular/forms';
import { marker as TEXT } from '@ngneat/transloco-keys-manager/marker';
import * as _ from 'lodash';
import { Subscription } from 'rxjs';

import { bytesToSize, toBytes } from '~/app/functions.helper';
import { S3gwValidators } from '~/app/shared/forms/validators';
import {
  DeclarativeForm,
  DeclarativeFormConfig,
  DeclarativeFormValues,
  FormButtonConfig,
  FormFieldConfig,
  FormFieldModifier
} from '~/app/shared/models/declarative-form-config.type';
import { ConstraintService } from '~/app/shared/services/constraint.service';
import { NotificationService } from '~/app/shared/services/notification.service';

let nextUniqueId = 0;

@Component({
  selector: 's3gw-declarative-form',
  templateUrl: './declarative-form.component.html',
  styleUrls: ['./declarative-form.component.scss']
})
export class DeclarativeFormComponent implements AfterViewInit, DeclarativeForm, OnInit, OnDestroy {
  @Input()
  config?: DeclarativeFormConfig;

  @Input()
  formGroup?: FormGroup;

  @Input()
  initValues?: DeclarativeFormValues;

  private subscriptions: Subscription = new Subscription();

  constructor(
    private clipboard: Clipboard,
    private formBuilder: FormBuilder,
    private notificationService: NotificationService
  ) {}

  /**
   * Get all form values, including those with `submitValue=false`.
   */
  get allValues(): DeclarativeFormValues {
    const values: DeclarativeFormValues = this.formGroup?.getRawValue() ?? {};
    _.forEach(this.getFields(), (field: FormFieldConfig) => {
      const value = values[field.name!];
      if (value) {
        values[field.name!] = this.convertToRaw(value, field);
      }
    });
    return values;
  }

  /**
   * Get all form values, except those with `submitValue=false`.
   */
  get values(): DeclarativeFormValues {
    let values: DeclarativeFormValues = this.allValues;
    _.forEach(this.getFields(), (field: FormFieldConfig) => {
      if (field.submitValue === false) {
        values = _.omit(values, [field.name!]);
      }
    });
    return values;
  }

  /**
   * Get all form values, including those with `submitValue=false`.
   */
  get allModifiedValues(): DeclarativeFormValues {
    const values: DeclarativeFormValues = {};
    _.forEach(this.getFields(), (field: FormFieldConfig) => {
      const control = this.getControl(field.name!);
      if (control?.touched) {
        values[field.name!] = this.convertToRaw(control.value, field);
      }
    });
    return values;
  }

  /**
   * Get all form values, except those with `submitValue=false`.
   */
  get modifiedValues(): DeclarativeFormValues {
    let values: DeclarativeFormValues = this.allModifiedValues;
    _.forEach(this.getFields(), (field: FormFieldConfig) => {
      if (field.submitValue === false) {
        values = _.omit(values, [field.name!]);
      }
    });
    return values;
  }

  get valid(): boolean {
    return this.formGroup?.valid ?? false;
  }

  get pristine(): boolean {
    return this.formGroup?.pristine ?? true;
  }

  private static createFormControl(field: FormFieldConfig): FormControl {
    const validators: Array<ValidatorFn> = [];
    const asyncValidator: Array<AsyncValidatorFn> = [];
    if (field.validators) {
      if (_.isNumber(field.validators.min)) {
        validators.push(Validators.min(field.validators.min));
      }
      if (_.isNumber(field.validators.max)) {
        validators.push(Validators.max(field.validators.max));
      }
      if (_.isNumber(field.validators.minLength)) {
        validators.push(Validators.minLength(field.validators.minLength));
      }
      if (_.isNumber(field.validators.maxLength)) {
        validators.push(Validators.maxLength(field.validators.maxLength));
      }
      if (_.isBoolean(field.validators.required) && field.validators.required) {
        validators.push(Validators.required);
      }
      if (_.isPlainObject(field.validators.requiredIf)) {
        validators.push(S3gwValidators.requiredIf(field.validators.requiredIf!));
      }
      if (_.isString(field.validators.pattern) || _.isRegExp(field.validators.pattern)) {
        validators.push(Validators.pattern(field.validators.pattern));
      }
      if (_.isString(field.validators.patternType)) {
        switch (field.validators.patternType) {
          case 'email':
            validators.push(Validators.email);
            break;
          case 'hostAddress':
            validators.push(S3gwValidators.hostAddress());
            break;
          case 'numeric':
            validators.push(Validators.pattern(/^[-]?\d+$/));
            break;
          case 'binaryUnit':
            validators.push(Validators.pattern(/^\d+(.\d+)?\s?(b|[kmgtpezy]ib)$/i));
            break;
        }
      }
      if (_.isPlainObject(field.validators.constraint)) {
        validators.push(
          S3gwValidators.constraint(
            field.validators.constraint!.constraint,
            field.validators.constraint!.errorMessage
          )
        );
      }
      if (_.isFunction(field.validators.custom)) {
        validators.push(field.validators.custom);
      }
      if (_.isFunction(field.validators.asyncCustom)) {
        asyncValidator.push(field.validators.asyncCustom);
      }
    }
    let value = _.defaultTo(field.value, null);
    if (field.type === 'binary' && _.isNumber(value)) {
      value = bytesToSize(field.value);
    }
    return new FormControl(
      { value, disabled: _.defaultTo(field.readonly, false) },
      validators,
      asyncValidator
    );
  }

  ngOnInit(): void {
    this.config = _.defaultsDeep(this.config, {
      id: `s3gw-declarative-form-${++nextUniqueId}`,
      buttonAlign: 'end'
    });
    const fields: Array<FormFieldConfig> = this.getFields(true);
    _.forEach(fields, (field: FormFieldConfig) => {
      _.defaultsDeep(field, {
        hasCopyToClipboardButton: false,
        placeholder: '',
        options: {}
      });
      switch (field.type) {
        case 'checkbox':
        case 'radio':
          _.defaultsDeep(field, {
            id: `${field.name}-${++nextUniqueId}`
          });
          break;
      }
    });
    this.formGroup = this.createForm();
    // Initialize onValueChanges callbacks.
    _.forEach(
      _.filter(fields, (field) => _.isFunction(field.onValueChanges)),
      (field: FormFieldConfig) => {
        const control: AbstractControl | null = this.getControl(field.name!);
        if (control) {
          this.subscriptions.add(
            control.valueChanges.subscribe((value: any) => {
              value = this.convertToRaw(value, field);
              field.onValueChanges!(value, control, this);
            })
          );
        }
      }
    );
    // Initialize field 'modifiers' that are applied when the specified
    // constraint succeeds.
    _.forEach(
      _.filter(fields, (field) => !_.isEmpty(field.modifiers)),
      (field: FormFieldConfig) => {
        _.forEach(field.modifiers, (modifier: FormFieldModifier) => {
          const props = ConstraintService.getProps(modifier.constraint);
          _.pull(props, field.name);
          // Get notified about changes to the form fields that are
          // involved in the constraint. On value changes, test the
          // constraint and modify the target field if necessary.
          _.forEach(props, (prop: string) => {
            this.subscriptions.add(
              this.getControl(prop)?.valueChanges.subscribe(() => {
                this.applyModifier(field, modifier);
              })
            );
          });
          // Finally, apply the modifier to the form field.
          this.applyModifier(field, modifier);
        });
      }
    );
    // Set initial form values.
    if (this.initValues) {
      this.patchValues(this.initValues);
    }
  }

  ngAfterViewInit(): void {
    // Note, all form fields with a 'visible' or 'hidden' modifier must be
    // triggered manually after the form has been rendered because the
    // control does not exist during 'ngOnInit', thus their class list can
    // not be updated according to the evaluated constraint.
    const fields: Array<FormFieldConfig> = this.getFields();
    const fieldsToUpdate: string[] = [];
    _.forEach(
      _.filter(fields, (field) => !_.isEmpty(field.modifiers)),
      (field: FormFieldConfig) => {
        _.forEach(field.modifiers, (modifier: FormFieldModifier) => {
          if (['visible', 'hidden'].includes(modifier.type)) {
            const props = ConstraintService.getProps(modifier.constraint);
            fieldsToUpdate.push(...props);
          }
        });
      }
    );
    _.forEach(_.uniq(fieldsToUpdate), (path) => {
      const control = this.getControl(path);
      control?.updateValueAndValidity({ onlySelf: true, emitEvent: true });
    });
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  createForm(): FormGroup {
    const controlsConfig: Record<string, FormControl> = {};
    _.forEach(this.getFields(), (field: FormFieldConfig) => {
      controlsConfig[field.name!] = DeclarativeFormComponent.createFormControl(field);
    });
    return this.formBuilder.group(controlsConfig);
  }

  getControl(path: string): AbstractControl | null {
    return this.formGroup ? this.formGroup.get(path) : null;
  }

  onCopyToClipboard(field: FormFieldConfig): void {
    const text = this.formGroup?.get(field.name!)?.value;
    const success = this.clipboard.copy(text);
    if (success) {
      this.notificationService.showSuccess(TEXT('Copied text to the clipboard successfully.'));
    } else {
      this.notificationService.showError(TEXT('Failed to copy text to the clipboard.'));
    }
  }

  onPaste(field: FormFieldConfig, event: ClipboardEvent): void {
    if (_.isFunction(field.onPaste)) {
      field.onPaste(event);
    }
  }

  onButtonClick(event: Event, buttonConfig: FormButtonConfig) {
    event.stopPropagation();
    if (_.isFunction(buttonConfig.click)) {
      buttonConfig.click(buttonConfig, this.values);
    }
  }

  patchValues(values: DeclarativeFormValues, markAsDirty: boolean = true): void {
    this.formGroup?.patchValue(values);
    if (markAsDirty) {
      _.forEach(_.keys(values), (key) => {
        const control = this.formGroup?.get(key);
        control?.markAsDirty();
      });
    }
  }

  /**
   * Reports whether the control with the given path has the error specified.
   */
  showError(
    path: Array<string | number> | string,
    fgd: FormGroupDirective,
    errorCode?: string
  ): boolean {
    const control = fgd.form.get(path);
    return control
      ? (fgd.submitted || control.dirty) &&
          (errorCode ? control.hasError(errorCode) : control.invalid)
      : false;
  }

  /**
   * Marks all descendants pristine.
   */
  public markAsPristine(): void {
    this.formGroup?.markAsPristine();
  }

  /**
   * Get the list of fields used in this form.
   *
   * @param all If set to `true`, all fields are included, also those
   *   inside `container` fields. If set to `false`, only fields with
   *   the `name` property are included. Defaults to `false`.
   * @private
   */
  private getFields(all: boolean = false): Array<FormFieldConfig> {
    const flatten = (fields: Array<FormFieldConfig>): Array<FormFieldConfig> =>
      _.flatMap(
        _.filter(
          fields,
          (field: FormFieldConfig) => all || !_.isUndefined(field.name) || _.isArray(field.fields)
        ),
        (field: FormFieldConfig) => {
          if (_.isArray(field.fields)) {
            return flatten(field.fields);
          } else {
            return field;
          }
        }
      );
    return flatten(this.config?.fields || []);
  }

  /**
   * Helper function to convert a value from it's displayed to the real
   * internal representation, e.g. '1 MiB' will become 1048576 for a
   * 'binary' form field.
   *
   * @param value The 'displayed' value.
   * @param field The form field.
   * @private
   * @return Returns the real value.
   */
  private convertToRaw(value: any, field: FormFieldConfig): any {
    switch (field.type) {
      case 'binary':
        value = toBytes(value);
        break;
    }
    return value;
  }

  private applyModifier(field: FormFieldConfig, modifier: FormFieldModifier) {
    const successful = ConstraintService.test(modifier.constraint, this.allValues);
    const opposite = _.defaultTo(modifier?.opposite, true);
    const control: AbstractControl | null = this.getControl(field.name!);
    const nativeElement: HTMLElement | undefined = _.get(control, 'nativeElement');
    const formFieldElement = nativeElement && (nativeElement as HTMLElement).closest('.form-field');
    switch (modifier.type) {
      case 'readonly':
        if (successful) {
          control?.disable();
        }
        if (!successful && opposite) {
          control?.enable();
        }
        break;
      case 'value':
        if (successful) {
          control?.setValue(modifier.data);
        }
        break;
      case 'visible':
        if (!_.isUndefined(formFieldElement)) {
          if (successful) {
            (formFieldElement as HTMLElement).classList.remove('d-none');
          }
          if (!successful && opposite) {
            (formFieldElement as HTMLElement).classList.add('d-none');
          }
        }
        break;
      case 'hidden':
        if (!_.isUndefined(formFieldElement)) {
          if (successful) {
            (formFieldElement as HTMLElement).classList.add('d-none');
          }
          if (!successful && opposite) {
            (formFieldElement as HTMLElement).classList.remove('d-none');
          }
        }
        break;
    }
  }
}
