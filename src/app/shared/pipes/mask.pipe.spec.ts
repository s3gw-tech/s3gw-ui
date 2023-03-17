import { MaskPipe } from '~/app/shared/pipes/mask.pipe';

describe('MaskPipe', () => {
  const pipe = new MaskPipe();

  it('create an instance', () => {
    expect(pipe).toBeTruthy();
  });

  it('mask data (1)', () => {
    expect(pipe.transform('abc')).toBe('***');
  });

  it('mask data (2)', () => {
    expect(pipe.transform('bar baz', 'X')).toBe('XXXXXXX');
  });

  it('mask data (3)', () => {
    expect(pipe.transform(undefined)).toBe('');
  });
});
