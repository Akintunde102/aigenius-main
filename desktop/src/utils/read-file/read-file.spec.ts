import { resolveContextBudget } from './context-budget-policy';
import { truncateLongLine, DEFAULT_MAX_LINE_CHARS } from './long-line';
import { formatNumberedLines } from '../read-file-lines';

describe('read-file utilities', () => {
  describe('resolveContextBudget', () => {
    it('tiers by model context window', () => {
      expect(resolveContextBudget(16_000).maxChars).toBe(15_000);
      expect(resolveContextBudget(16_000).maxFiles).toBe(2);
      expect(resolveContextBudget(64_000).maxChars).toBe(25_000);
      expect(resolveContextBudget(64_000).maxFiles).toBe(4);
      expect(resolveContextBudget(150_000).maxChars).toBe(40_000);
      expect(resolveContextBudget(200_000).maxChars).toBe(40_000);
      expect(resolveContextBudget(1_000_000).maxChars).toBe(60_000);
      expect(resolveContextBudget(1_000_000).maxFiles).toBe(10);
    });

    it('uses default tier when context length missing', () => {
      const b = resolveContextBudget(undefined);
      expect(b.maxChars).toBe(25_000);
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
