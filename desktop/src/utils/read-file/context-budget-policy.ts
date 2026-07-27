import type { BatchReadBudget, SingleFileLineBudget } from './types';

export const BATCH_CONTEXT_FRACTION = 0.4;
export const CHARS_PER_TOKEN_ESTIMATE = 3.5;
export const MAX_BATCH_READ_PATHS = 20;
export const DEFAULT_CONTEXT_LENGTH = 128_000;

function resolveModelContextTokens(modelContextLength?: number): number {
  return typeof modelContextLength === 'number' && modelContextLength > 0
    ? modelContextLength
    : DEFAULT_CONTEXT_LENGTH;
}

/** Shared char pool for reads[] batch — 40% of model context (token-estimated). */
export function resolveBatchReadBudget(modelContextLength?: number): BatchReadBudget {
  const modelContextTokens = resolveModelContextTokens(modelContextLength);
  const budgetTokens = Math.floor(modelContextTokens * BATCH_CONTEXT_FRACTION);
  const budgetChars = Math.floor(budgetTokens * CHARS_PER_TOKEN_ESTIMATE);
  return {
    modelContextTokens,
    budgetTokens,
    budgetChars: Math.max(budgetChars, 1_000),
    maxPaths: MAX_BATCH_READ_PATHS,
    budgetFraction: BATCH_CONTEXT_FRACTION,
  };
}

/** Default line window for single-file reads (pagination / non-batch). */
export function resolveSingleFileLineBudget(modelContextLength?: number): SingleFileLineBudget {
  const ctx = resolveModelContextTokens(modelContextLength);

  if (ctx <= 32_000) {
    return { maxLines: 400 };
  }
  if (ctx <= 128_000) {
    return { maxLines: 800 };
  }
  if (ctx <= 200_000) {
    return { maxLines: 1_200 };
  }
  return { maxLines: 2_000 };
}

/** @deprecated Use resolveBatchReadBudget / resolveSingleFileLineBudget */
export function resolveContextBudget(modelContextLength?: number): {
  maxChars: number;
  maxLines: number;
  maxFiles: number;
} {
  const batch = resolveBatchReadBudget(modelContextLength);
  const single = resolveSingleFileLineBudget(modelContextLength);
  return {
    maxChars: batch.budgetChars,
    maxLines: single.maxLines,
    maxFiles: batch.maxPaths,
  };
}
