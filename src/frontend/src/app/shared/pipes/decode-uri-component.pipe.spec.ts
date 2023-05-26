import { DecodeUriComponentPipe } from '~/app/shared/pipes/decode-uri-component.pipe';

describe('DecodeUriComponentPipe', () => {
  const pipe = new DecodeUriComponentPipe();

  it('create an instance', () => {
    expect(pipe).toBeTruthy();
  });

  it('should decode [1]', () => {
    expect(pipe.transform('foo.txt')).toBe('foo.txt');
  });

  it('should decode [2]', () => {
    expect(pipe.transform(encodeURIComponent('/a/b/foo.txt'))).toBe('/a/b/foo.txt');
  });
});
