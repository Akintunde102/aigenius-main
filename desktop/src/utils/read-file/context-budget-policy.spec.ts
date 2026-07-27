import { describe, expect, it } from '@jest/globals';
import {
  BATCH_CONTEXT_FRACTION,
  CHARS_PER_TOKEN_ESTIMATE,
  resolveBatchReadBudget,
} from './context-budget-policy';

describe('resolveBatchReadBudget', () => {
  it('uses 40% of model context tokens converted to chars', () => {
    const budget = resolveBatchReadBudget(100_000);
    expect(budget.budgetFraction).toBe(BATCH_CONTEXT_FRACTION);
    expect(budget.budgetTokens).toBe(40_000);
    expect(budget.budgetChars).toBe(Math.floor(40_000 * CHARS_PER_TOKEN_ESTIMATE));
    expect(budget.modelContextTokens).toBe(100_000);
  });

  it('defaults to 128k when context length missing', () => {
    const budget = resolveBatchReadBudget(undefined);
    expect(budget.modelContextTokens).toBe(128_000);
    expect(budget.budgetTokens).toBe(Math.floor(128_000 * BATCH_CONTEXT_FRACTION));
  });
});
