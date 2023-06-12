import {
  basename,
  bytesToSize,
  extractErrorCode,
  extractErrorDescription,
  extractErrorMessage,
  format,
  isEqualOrUndefined,
  isObjectVersionID,
  toBytes
} from '~/app/functions.helper';

describe('functions.helper', () => {
  it('should convert value to bytes [1]', () => {
    expect(toBytes(1024)).toBe(1024);
  });

  it('should convert value to bytes [2]', () => {
    expect(toBytes('1024')).toBe(1024);
  });

  it('should convert value to bytes [3]', () => {
    expect(toBytes('')).toBeNull();
  });

  it('should convert value to bytes [4]', () => {
    expect(toBytes('512B')).toBe(512);
  });

  it('should convert value to bytes [5]', () => {
    expect(toBytes('1 KiB')).toBe(1024);
  });

  it('should convert value to bytes [6]', () => {
    expect(toBytes('1M')).toBe(1048576);
  });

  it('should convert value to bytes [7]', () => {
    expect(toBytes('1 GiB')).toBe(1073741824);
  });

  it('should convert bytes to value [1]', () => {
    expect(bytesToSize(null)).toBe('0 B');
  });

  it('should convert bytes to value [2]', () => {
    expect(bytesToSize('')).toBe('0 B');
  });

  it('should convert bytes to value [3]', () => {
    expect(bytesToSize(1048576)).toBe('1 MiB');
  });

  it('should convert bytes to value [4]', () => {
    expect(bytesToSize(1073741824)).toBe('1 GiB');
  });

  it('should format a string [1]', () => {
    expect(format('Hello {{ username }}!', { username: 'foo' })).toBe('Hello foo!');
  });

  it('should format a string [2]', () => {
    expect(format('foo {{ x.y.z }} {{ a }}', { a: 'baz', x: { y: { z: 'bar' } } })).toBe(
      'foo bar baz'
    );
  });

  it('should isEqualOrUndefined [1]', () => {
    expect(isEqualOrUndefined('foo', undefined)).toBeTruthy();
  });

  it('should isEqualOrUndefined [2]', () => {
    expect(isEqualOrUndefined(undefined, 'bar')).toBeTruthy();
  });

  it('should isEqualOrUndefined [3]', () => {
    expect(isEqualOrUndefined('bar', 'bar')).toBeTruthy();
  });

  it('should isEqualOrUndefined [4]', () => {
    expect(isEqualOrUndefined('foo', 'bar')).toBeFalsy();
  });

  it('should extract error code [1]', () => {
    expect(
      extractErrorCode({
        code: 'InvalidLocationConstraint',
        name: 'InvalidLocationConstraint',
        statusCode: 400
      })
    ).toBe('InvalidLocationConstraint');
  });

  it('should extract error code [2]', () => {
    expect(
      extractErrorCode({
        statusCode: 400
      })
    ).toBe(400);
  });

  it('should extract error code [3]', () => {
    expect(
      extractErrorCode({
        error: 'foo',
        statusCode: 400
      })
    ).toBe('foo');
  });

  it('should extract error code [4]', () => {
    expect(
      extractErrorCode({
        name: 'InvalidLocationConstraint',
        statusCode: 400
      })
    ).toBe('InvalidLocationConstraint');
  });

  it('should extract error message [5]', () => {
    expect(extractErrorCode({})).toBeUndefined();
  });

  it('should extract error message [1]', () => {
    expect(
      extractErrorMessage({
        code: 'InvalidLocationConstraint',
        statusCode: 400,
        message: 'The specified location-constraint is not valid'
      })
    ).toBe('The specified location-constraint is not valid');
  });

  it('should extract error message [2]', () => {
    expect(
      extractErrorMessage({
        code: 'InvalidLocationConstraint',
        statusCode: 400,
        statusText: 'foo bar baz'
      })
    ).toBe('foo bar baz');
  });

  it('should extract error message [3]', () => {
    expect(extractErrorMessage({})).toBeUndefined();
  });

  it('should extract error description [1]', () => {
    expect(
      extractErrorDescription({
        code: 'aaa',
        message: 'bbb'
      })
    ).toBe('code=aaa, message=bbb');
  });

  it('should extract error description [1]', () => {
    expect(
      extractErrorDescription({
        name: 'aaa'
      })
    ).toBe('code=aaa');
  });

  it('should extract error description [2]', () => {
    expect(
      extractErrorDescription({
        statusText: 'bbb'
      })
    ).toBe('message=bbb');
  });

  it('should get basename [1]', () => {
    expect(basename('foo.txt')).toBe('foo.txt');
  });

  it('should get basename [2]', () => {
    expect(basename('x/y/foo.txt')).toBe('foo.txt');
  });

  it('should get basename [3]', () => {
    expect(basename('/a/foo.txt')).toBe('foo.txt');
  });

  it('should get basename [4]', () => {
    expect(basename('/a/foo.txt/')).toBe('');
  });

  it('should check object version ID [1]', () => {
    expect(isObjectVersionID('dCtsKWse.gXlGdbY3XnQq97qw21Lkcf')).toBeTruthy();
  });

  it('should check object version ID [2]', () => {
    expect(isObjectVersionID('null')).toBeTruthy();
  });

  it('should check object version ID [3]', () => {
    expect(isObjectVersionID('null', true)).toBeFalsy();
  });

  it('should check object version ID [4]', () => {
    expect(isObjectVersionID('')).toBeFalsy();
  });

  it('should check object version ID [5]', () => {
    expect(isObjectVersionID(1234)).toBeFalsy();
  });
});
