import {
  resolveBatchReadBudget,
  resolveContextBudget,
  resolveSingleFileLineBudget,
  CHARS_PER_TOKEN_ESTIMATE,
  BATCH_CONTEXT_FRACTION,
} from './context-budget-policy';
import { truncateLongLine, DEFAULT_MAX_LINE_CHARS } from './long-line';
import { formatNumberedLines } from '../read-file-lines';

describe('read-file utilities', () => {
  describe('resolveBatchReadBudget', () => {
    it('allocates 40% of context as char budget', () => {
      const b = resolveBatchReadBudget(100_000);
      expect(b.budgetFraction).toBe(BATCH_CONTEXT_FRACTION);
      expect(b.budgetTokens).toBe(40_000);
      expect(b.budgetChars).toBe(Math.floor(40_000 * CHARS_PER_TOKEN_ESTIMATE));
      expect(b.maxPaths).toBe(20);
    });
  });

  describe('resolveSingleFileLineBudget', () => {
    it('tiers default max lines for single-file reads', () => {
      expect(resolveSingleFileLineBudget(16_000).maxLines).toBe(400);
      expect(resolveSingleFileLineBudget(128_000).maxLines).toBe(800);
      expect(resolveSingleFileLineBudget(1_000_000).maxLines).toBe(2_000);
    });
  });

  describe('resolveContextBudget (compat)', () => {
    it('maps batch + single budgets for legacy callers', () => {
      const b = resolveContextBudget(128_000);
      expect(b.maxChars).toBe(resolveBatchReadBudget(128_000).budgetChars);
      expect(b.maxLines).toBe(800);
      expect(b.maxFiles).toBe(20);
    });
  });

  describe('truncateLongLine', () => {
    it('truncates lines beyond max chars', () => {
      const long = 'x'.repeat(DEFAULT_MAX_LINE_CHARS + 50);
      const { text, truncated } = truncateLongLine(long);
      expect(truncated).toBe(true);
      expect(text.length).toBeLessThan(long.length);
      expect(text).toContain('[line truncated');
    });
  });

  describe('formatNumberedLines', () => {
    it('uses cat -n tab format', () => {
      const out = formatNumberedLines(['alpha', 'beta'], 10);
      expect(out).toContain('\talpha');
      expect(out).toContain('10\t');
      expect(out).toContain('11\t');
    });

    it('pads line numbers for large files (LLM line reference stability)', () => {
      const out = formatNumberedLines(['x'], 999);
      expect(out).toMatch(/^\s+999\t/);
    });
  });
});
