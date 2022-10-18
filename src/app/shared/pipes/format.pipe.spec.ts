import { FormatPipe } from '~/app/shared/pipes/format.pipe';

describe('FormatPipe', () => {
  const pipe = new FormatPipe();

  it('create an instance', () => {
    expect(pipe).toBeTruthy();
  });

  it('should format string [1]', () => {
    expect(pipe.transform('{{ foo }}', { foo: 'abc' })).toBe('abc');
  });

  it('should format string [2]', () => {
    expect(pipe.transform('{{ a.b }}', { a: { b: 2 } })).toBe('2');
  });
});
