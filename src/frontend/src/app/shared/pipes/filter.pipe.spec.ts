import { FilterPipe } from '~/app/shared/pipes/filter.pipe';

describe('FilterPipe', () => {
  const pipe = new FilterPipe();

  it('create an instance', () => {
    expect(pipe).toBeTruthy();
  });

  it('should filter [1]', () => {
    expect(pipe.transform([{ a: 1 }, { a: 2 }, { a: 1 }], ['a', 1]).length).toBe(2);
  });

  it('should filter [2]', () => {
    expect(pipe.transform([{ a: 'aaa' }, { a: '' }], 'a').length).toBe(1);
  });
});
