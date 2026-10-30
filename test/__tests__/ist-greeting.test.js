const {
  getIstGreeting,
  getMillisecondsUntilNextIstGreeting,
} = require('@/utils/ist-greeting');

describe('IST greeting', () => {
  it.each([
    ['2026-10-28T23:30:00.000Z', 'Good Morning'],
    ['2026-10-28T06:30:00.000Z', 'Good Afternoon'],
    ['2026-10-28T12:30:00.000Z', 'Good Evening'],
    ['2026-10-28T18:30:00.000Z', 'Welcome Back'],
  ])('uses Asia/Kolkata for %s', (timestamp, expected) => {
    expect(getIstGreeting(new Date(timestamp))).toBe(expected);
  });

  it('adds the account first name when available', () => {
    expect(getIstGreeting(new Date('2026-10-28T06:30:00.000Z'), 'Harish')).toBe('Good Afternoon, Harish!');
  });

  it('schedules the next greeting transition instead of polling', () => {
    const now = new Date('2026-10-28T06:29:30.000Z'); // 11:59:30 IST
    expect(getMillisecondsUntilNextIstGreeting(now)).toBeGreaterThan(29_000);
    expect(getMillisecondsUntilNextIstGreeting(now)).toBeLessThan(31_000);
  });
});
