import {
  formatAccountDisplayName,
  formatMeSidebarMenuLabel,
  formatMemberSinceDate,
  formatPricePlanLabel,
  formatWalletBalance,
} from '../me-account-display.utils';

describe('me-account-display.utils', () => {
  it('formats sidebar menu label with email in parentheses', () => {
    expect(formatMeSidebarMenuLabel('alice@example.com')).toBe('(alice@example.com) Me');
    expect(formatMeSidebarMenuLabel('  ')).toBe('Me');
    expect(formatMeSidebarMenuLabel(undefined)).toBe('Me');
  });

  it('formats display name from first and last name', () => {
    expect(formatAccountDisplayName({ firstName: 'Ada', lastName: 'Lovelace' })).toBe('Ada Lovelace');
    expect(formatAccountDisplayName({ email: 'a@b.co' })).toBe('a@b.co');
  });

  it('formats plan and wallet', () => {
    expect(formatPricePlanLabel('pro')).toBe('Pro');
    expect(formatWalletBalance(12.5)).toBe('12.50');
  });

  it('formats member since when date is valid', () => {
    const formatted = formatMemberSinceDate('2024-06-15T12:00:00.000Z', 'en');
    expect(formatted).toMatch(/2024/);
    expect(formatMemberSinceDate('not-a-date')).toBeNull();
  });
});
