import {
  collectInFlightSessionIds,
  isSessionInFlight,
} from '../sessionInFlight';

describe('sessionInFlight', () => {
  it('returns true when loading or streaming for the session', () => {
    expect(isSessionInFlight('a', { a: true }, {})).toBe(true);
    expect(isSessionInFlight('a', {}, { a: true })).toBe(true);
    expect(isSessionInFlight('a', { a: false }, { a: false })).toBe(false);
  });

  it('collects unique in-flight session ids from both maps', () => {
    expect(
      collectInFlightSessionIds(
        { a: true, b: false, c: true },
        { b: true, d: true },
      ).sort(),
    ).toEqual(['a', 'b', 'c', 'd']);
  });
});
