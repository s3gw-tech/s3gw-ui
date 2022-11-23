import { fakeAsync, tick } from '@angular/core/testing';
import { AbstractControl, FormControl, FormGroup } from '@angular/forms';
import { of } from 'rxjs';

import { S3gwValidators } from '~/app/shared/forms/validators';

describe('GlassValidators', () => {
  let formGroup: FormGroup;

  beforeEach(() => {
    formGroup = new FormGroup({
      x: new FormControl()
    });
  });

  describe('hostAddress', () => {
    let control: AbstractControl | null;

    beforeEach(() => {
      control = formGroup.get('x');
      control?.setValidators(S3gwValidators.hostAddress());
    });

    it('should validate addr [1]', () => {
      control?.setValue('foo.local');
      expect(control?.valid).toBeTruthy();
    });

    it('should validate addr [2]', () => {
      control?.setValue('172.160.0.1');
      expect(control?.valid).toBeTruthy();
    });

    it('should validate addr [3]', () => {
      control?.setValue('bar:1337');
      expect(control?.invalid).toBeTruthy();
      expect(control?.errors).toEqual({ hostAddress: true });
    });

    it('should not validate addr [1]', () => {
      control?.setValue('123.456');
      expect(control?.invalid).toBeTruthy();
      expect(control?.errors).toEqual({ hostAddress: true });
    });

    it('should not validate addr [2]', () => {
      control?.setValue('foo.ba_z.com');
      expect(control?.invalid).toBeTruthy();
      expect(control?.errors).toEqual({ hostAddress: true });
    });

    it('should not validate addr [3]', () => {
      control?.setValue('foo:1a');
      expect(control?.invalid).toBeTruthy();
      expect(control?.errors).toEqual({ hostAddress: true });
    });
  });

  describe('unique', () => {
    let control: AbstractControl | null;

    beforeEach(() => {
      control = formGroup.get('x');
      control?.setAsyncValidators(S3gwValidators.unique((value) => of(value === 'test_value')));
    });

    it('should not show error for empty input', () => {
      expect(control?.invalid).toBeFalsy();
    });

    it('should not show error for unique input', fakeAsync(() => {
      control?.setValue('test_value_new');
      tick(500);
      expect(control?.invalid).toBeFalsy();
    }));

    it('should show error for input not unique', fakeAsync(() => {
      control?.setValue('test_value');
      tick(500);
      expect(control?.invalid).toBeTruthy();
      expect(control?.errors).toEqual({ notUnique: true });
    }));
  });

  describe('requiredIf', () => {
    let emailControl: AbstractControl;
    let enabledControl: AbstractControl;
    const validator = S3gwValidators.requiredIf({
      operator: 'eq',
      arg0: { prop: 'enabled' },
      arg1: true
    });
    const validator2 = S3gwValidators.requiredIf({
      operator: 'truthy',
      arg0: { prop: 'enabled' }
    });

    beforeEach(() => {
      formGroup = new FormGroup({
        enabled: new FormControl(false),
        email: new FormControl('')
      });
      emailControl = formGroup.get('email')!;
      enabledControl = formGroup.get('enabled')!;
    });

    it('should not validate requiredIf (1)', () => {
      expect(validator(emailControl)).toBeNull();
    });

    it('should not validate requiredIf (2)', () => {
      emailControl.setValue('foo@bar.com');
      expect(validator(emailControl)).toBeNull();
    });

    it('should not validate requiredIf (3)', () => {
      enabledControl.setValue(true);
      emailControl.setValue('foo@bar.com');
      expect(validator(emailControl)).toBeNull();
    });

    it('should validate requiredIf (1)', () => {
      enabledControl.setValue(true);
      expect(validator(emailControl)).toEqual({ required: true });
    });

    it('should validate requiredIf (2)', () => {
      enabledControl.setValue(true);
      expect(validator2(emailControl)).toEqual({ required: true });
    });
  });

  describe('constraint', () => {
    let enabledControl: AbstractControl;
    const validator = S3gwValidators.constraint(
      {
        operator: 'truthy',
        arg0: { prop: 'enabled' }
      },
      'xyz'
    );

    beforeEach(() => {
      formGroup = new FormGroup({
        enabled: new FormControl(false)
      });
      enabledControl = formGroup.get('enabled')!;
    });

    it('should validate constraint', () => {
      expect(validator(enabledControl)).toEqual({ custom: 'xyz' });
    });

    it('should not validate constraint', () => {
      enabledControl.setValue(true);
      expect(validator(enabledControl)).toBeNull();
    });
  });

  describe('bucketName', () => {
    let control: AbstractControl | null;

    beforeEach(() => {
      control = formGroup.get('x');
      control?.setValidators(S3gwValidators.bucketName());
    });

    it('should validate bucket name [1]', () => {
      control?.setValue('foo.-bar');
      expect(control?.valid).toBeTruthy();
    });

    it('should not validate bucket name [2]', () => {
      control?.setValue('a'.repeat(2));
      expect(control?.invalid).toBeTruthy();
      expect(control?.errors?.['custom']).toMatch(/^Minimum length is/);
    });

    it('should not validate bucket name [3]', () => {
      control?.setValue('a'.repeat(64));
      expect(control?.invalid).toBeTruthy();
      expect(control?.errors?.['custom']).toMatch(/^Maximum length is/);
    });

    it('should not validate bucket name [4]', () => {
      control?.setValue('a#&!');
      expect(control?.invalid).toBeTruthy();
      expect(control?.errors?.['custom']).toMatch(/^The value contains invalid characters./);
    });

    it('should not validate bucket name [5]', () => {
      control?.setValue('-abc');
      expect(control?.invalid).toBeTruthy();
      expect(control?.errors?.['custom']).toBe(
        'The value must begin and end with a letter or number.'
      );
    });

    it('should not validate bucket name [6]', () => {
      control?.setValue('1abc.');
      expect(control?.invalid).toBeTruthy();
      expect(control?.errors?.['custom']).toBe(
        'The value must begin and end with a letter or number.'
      );
    });

    it('should not validate bucket name [7]', () => {
      control?.setValue('1abc..a');
      expect(control?.invalid).toBeTruthy();
      expect(control?.errors?.['custom']).toBe('The value must not contain two adjacent periods.');
    });

    it('should not validate bucket name [8]', () => {
      control?.setValue('127.0.0.1');
      expect(control?.invalid).toBeTruthy();
      expect(control?.errors?.['custom']).toBe('The value must not be formatted as an IP address.');
    });

    it('should not validate bucket name [9]', () => {
      control?.setValue('xn--foo');
      expect(control?.invalid).toBeTruthy();
      expect(control?.errors?.['custom']).toBe('The value must not start with the prefix xn--.');
    });

    it('should not validate bucket name [10]', () => {
      control?.setValue('foo-s3alias');
      expect(control?.invalid).toBeTruthy();
      expect(control?.errors?.['custom']).toBe('The value must not end with the suffix -s3alias.');
    });
  });
});
