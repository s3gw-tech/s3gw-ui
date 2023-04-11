import dayjs from 'dayjs';

import { LocaleDatePipe } from '~/app/shared/pipes/locale-date.pipe';

describe('LocaleDatePipe', () => {
  const pipe = new LocaleDatePipe();

  it('create an instance', () => {
    expect(pipe).toBeTruthy();
  });

  it('transform date into human readable time (1)', () => {
    jest
      .spyOn(pipe, 'toLocaleString')
      .mockImplementation((dt: Date) => dt.toLocaleString('de-DE', { timeZone: 'Europe/Berlin' }));
    const date: Date = dayjs('2022-08-17T10:35:10.543Z').toDate();
    expect(pipe.transform(date, 'datetime')).toBe('17.8.2022, 12:35:10');
  });

  it('transform date into human readable time (2)', () => {
    jest
      .spyOn(pipe, 'toLocaleString')
      .mockImplementation((dt: Date) =>
        dt.toLocaleTimeString('de-DE', { timeZone: 'Europe/Berlin' })
      );
    const date: Date = dayjs('2022-08-17T10:35:10.543Z').toDate();
    expect(pipe.transform(date, 'time')).toBe('12:35:10');
  });

  it('transform date into human readable time (3)', () => {
    jest
      .spyOn(pipe, 'toLocaleString')
      .mockImplementation((dt: Date) =>
        dt.toLocaleDateString('de-DE', { timeZone: 'Europe/Berlin' })
      );
    const date: Date = dayjs('2022-08-17T10:35:10.543Z').toDate();
    expect(pipe.transform(date, 'date')).toBe('17.8.2022');
  });
});
