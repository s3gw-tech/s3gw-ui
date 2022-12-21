import {
  AbstractControl,
  AsyncValidatorFn,
  FormArray,
  FormGroup,
  ValidationErrors,
  ValidatorFn
} from '@angular/forms';
import { marker as TEXT } from '@ngneat/transloco-keys-manager/marker';
import * as _ from 'lodash';
import { Observable, of, timer } from 'rxjs';
import { map, switchMapTo, take } from 'rxjs/operators';
import validator from 'validator';

import { format } from '~/app/functions.helper';
import { Constraint } from '~/app/shared/models/constraint.type';
import { ConstraintService } from '~/app/shared/services/constraint.service';

const isEmptyInputValue = (value: any): boolean => _.isNull(value) || value.length === 0;

const getControlName = (control: AbstractControl): string | undefined => {
  if (!control || !control.parent) {
    return undefined;
  }
  const keys: string[] = _.keys(control.parent.controls);
  return keys.find((key: string) => control === _.get(control.parent!.controls, key));
};

export type ApiFn = (value: any) => Observable<boolean>;

/**
 * Get the data on the top form.
 *
 * @param control The control to start searching for the top most form.
 * @return The raw values of the top form.
 */
const getFormValues = (control: AbstractControl): any[] => {
  if (!control) {
    return [];
  }
  let parent: FormGroup | FormArray | null = control.parent;
  while (parent?.parent) {
    parent = parent.parent;
  }
  return parent ? parent.getRawValue() : [];
};

export class S3gwValidators {
  /**
   * Validator to check if the input is a valid IP-address or FQDN.
   *
   * @returns a validator function. The function returns the error `hostAddress` if the
   * validation fails, otherwise `null`.
   */
  static hostAddress(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (_.isEmpty(control.value)) {
        return null;
      }
      const valid =
        // eslint-disable-next-line @typescript-eslint/naming-convention
        validator.isIP(control.value) || validator.isFQDN(control.value, { require_tld: false });
      return !valid ? { hostAddress: true } : null;
    };
  }

  /**
   * Validator to check if a specific value is unique compared to the already existing
   * elements.
   *
   * @param api The API service function to call and check whether the component value
   *  is unique or not. The function must return `true` if the value exists, otherwise
   *  `false`.
   * @param thisArg `this` object for the service call.
   * @param interval Service call delay. It's useful to prevent the validation on any
   *  keystroke.
   * @returns an async validator function. The function returns the error `notUnique`
   *  if the validation failed, otherwise `null`.
   */
  static unique(api: ApiFn, thisArg: any = null, interval: number = 500): AsyncValidatorFn {
    return (control: AbstractControl): Observable<ValidationErrors | null> => {
      if (_.isEmpty(control.value)) {
        return of(null);
      }
      return timer(interval).pipe(
        switchMapTo(api.call(thisArg, control.value)),
        map((resp: boolean) => {
          if (!resp) {
            return null;
          } else {
            return { notUnique: true };
          }
        }),
        take(1)
      );
    };
  }

  /**
   * Validator that requires controls to fulfill the specified constraint.
   * If the constraint is fullfilled, the 'required' validation error will
   * be returned, otherwise null.
   *
   * @param constraint The constraint to process.
   * @returns a validator function.
   */
  static requiredIf(constraint: Constraint): ValidatorFn {
    let hasSubscribed = false;
    const props = ConstraintService.getProps(constraint);
    return (control: AbstractControl): ValidationErrors | null => {
      if (!hasSubscribed && control.parent) {
        props.forEach((key) => {
          control.parent!.get(key)!.valueChanges.subscribe(() => {
            control.updateValueAndValidity({ emitEvent: false });
          });
        });
        hasSubscribed = true;
      }
      const result = ConstraintService.test(constraint, getFormValues(control));
      if (!result) {
        return null;
      }
      return isEmptyInputValue(control.value) ? { required: true } : null;
    };
  }

  /**
   * Validator that requires controls to fulfill the specified constraint.
   * If the constraint is falsy, the 'custom' validation error with the
   * specified error message will be returned, otherwise null.
   *
   * @param constraint The constraint to process.
   * @param errorMessage The error message to be return.
   * @returns a validator function.
   */
  static constraint(constraint: Constraint, errorMessage: string): ValidatorFn {
    let hasSubscribed = false;
    const props = ConstraintService.getProps(constraint);
    return (control: AbstractControl): ValidationErrors | null => {
      if (!hasSubscribed && control.parent) {
        // Do not subscribe to changes of the own control.
        _.pull(props, getControlName(control));
        // Subscribe to changes of all involved fields.
        props.forEach((key) => {
          control.parent!.get(key)!.valueChanges.subscribe(() => {
            control.updateValueAndValidity({ emitEvent: false });
          });
        });
        hasSubscribed = true;
      }
      const result = ConstraintService.test(constraint, getFormValues(control));
      return !result ? { custom: errorMessage } : null;
    };
  }

  /**
   * Validator to check if the given bucket name is valid.
   *
   * @see https://docs.aws.amazon.com/AmazonS3/latest/userguide/bucketnamingrules.html
   *
   * @returns a validator function. The function returns the error `custom` if the
   * validation fails, otherwise `null`.
   */
  static bucketName(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (_.isEmpty(control.value)) {
        return null;
      }
      // Must be between 3 (min) and 63 (max) characters long.
      if (control.value.length < 3) {
        return { custom: format(TEXT('Minimum length is {{ num }} characters.'), { num: 3 }) };
      }
      if (control.value.length > 63) {
        return { custom: format(TEXT('Maximum length is {{ num }} characters.'), { num: 63 }) };
      }
      // Can consist only of lowercase letters, numbers, dots (.), and hyphens (-).
      if (!/^[0-9a-z.-]+$/.test(control.value)) {
        return {
          custom: TEXT(
            'The value contains invalid characters. Only lowercase letters, numbers, dots and hyphens are allowed.'
          )
        };
      }
      // Must begin and end with a letter or number.
      if (
        !_.every([control.value.slice(0, 1), control.value.slice(-1)], (c) => {
          return /[a-z]/.test(c) || _.isInteger(_.parseInt(c));
        })
      ) {
        return {
          custom: TEXT('The value must begin and end with a letter or number.')
        };
      }
      // Must not contain two adjacent periods.
      if (control.value.includes('..')) {
        return {
          custom: TEXT('The value must not contain two adjacent periods.')
        };
      }
      // Must not be formatted as an IP address.
      if (validator.isIP(control.value)) {
        return {
          custom: TEXT('The value must not be formatted as an IP address.')
        };
      }
      // Must not start with the prefix `xn--`.
      if (_.startsWith(control.value, 'xn--')) {
        return {
          custom: TEXT('The value must not start with the prefix xn--.')
        };
      }
      // Must not end with the suffix `-s3alias`.
      if (_.endsWith(control.value, '-s3alias')) {
        return {
          custom: TEXT('The value must not end with the suffix -s3alias.')
        };
      }
      return null;
    };
  }
}
