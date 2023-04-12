import { NotAvailablePipe } from '~/app/shared/pipes/not-available.pipe';

describe('NotAvailablePipe', () => {
  const pipe = new NotAvailablePipe();

  it('create an instance', () => {
    expect(pipe).toBeTruthy();
  });

  it('transforms with value (1)', () => {
    expect(pipe.transform(undefined)).toBe('n/a');
  });

  it('transforms with value (2)', () => {
    expect(pipe.transform(null)).toBe('n/a');
  });

  it('transforms with value (3)', () => {
    expect(pipe.transform('')).toBe('n/a');
  });

  it('transforms with value (4)', () => {
    expect(pipe.transform(undefined, 'foo')).toBe('foo');
  });

  it('transforms with some value', () => {
    expect(pipe.transform('bar')).toBe('bar');
  });
});
