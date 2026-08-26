import { resolveStoredColorMode } from '../color-mode';

describe('resolveStoredColorMode', () => {
  it('prefers the main color-mode key over the legacy landing key', () => {
    expect(resolveStoredColorMode('light', 'dark', true)).toBe('light');
  });

  it('falls back to the legacy landing key', () => {
    expect(resolveStoredColorMode(null, 'dark', false)).toBe('dark');
  });

  it('uses system preference when no explicit choice is stored', () => {
    expect(resolveStoredColorMode('system', null, true)).toBe('dark');
    expect(resolveStoredColorMode(null, null, false)).toBe('light');
  });
});
