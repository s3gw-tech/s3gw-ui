import { TruncatePipe } from '~/app/shared/pipes/truncate.pipe';

describe('TruncatePipe', () => {
  const pipe = new TruncatePipe();

  it('create an instance', () => {
    expect(pipe).toBeTruthy();
  });

  it('should truncate string [1]', () => {
    expect(pipe.transform('foo bar baz', 5)).toBe('foo b...');
  });

  it('should truncate string [2]', () => {
    expect(pipe.transform('foo bar baz', 7)).toBe('foo bar...');
  });

  it('should truncate string [3]', () => {
    expect(pipe.transform('abcdef', 2)).toBe('ab...');
  });

  it('should truncate string [4]', () => {
    expect(pipe.transform('abcdef', 10)).toBe('abcdef');
  });
});
