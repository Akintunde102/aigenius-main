import { formatCreditAmount, formatCredits } from '../credits';

describe('formatCredits', () => {
  it('shows up to two decimal places for fractional usage', () => {
    expect(formatCredits(0.37)).toBe('0.37 credits');
    expect(formatCredits(8.51)).toBe('8.51 credits');
  });

  it('does not round sub-credit speech holds to whole zero', () => {
    expect(formatCreditAmount(0.49)).toBe('0.49');
    expect(formatCredits(0.49)).toBe('0.49 credits');
  });

  it('omits trailing decimals for whole credit amounts', () => {
    expect(formatCredits(8)).toBe('8 credits');
    expect(formatCredits(600)).toBe('600 credits');
  });
});
