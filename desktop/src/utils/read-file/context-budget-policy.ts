import type { ContextBudget } from './types';

const DEFAULT_CONTEXT_LENGTH = 128_000;

/** Model-context tiers from PRD §6 (chars + max batch files). */
export function resolveContextBudget(modelContextLength?: number): ContextBudget {
  const ctx = typeof modelContextLength === 'number' && modelContextLength > 0
    ? modelContextLength
    : DEFAULT_CONTEXT_LENGTH;

  if (ctx <= 32_000) {
    return { maxChars: 15_000, maxLines: 400, maxFiles: 2 };
  }
  if (ctx <= 128_000) {
    return { maxChars: 25_000, maxLines: 800, maxFiles: 4 };
  }
  if (ctx <= 200_000) {
    return { maxChars: 40_000, maxLines: 1_200, maxFiles: 6 };
  }
  return { maxChars: 60_000, maxLines: 2_000, maxFiles: 10 };
}
