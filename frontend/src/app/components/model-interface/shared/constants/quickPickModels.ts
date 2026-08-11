import type { Model } from "@/app/components/model-interface/shared/types";

/**
 * Curated default quick-pick models — one strong option per major lab plus free/fast tiers.
 * Order: free → daily drivers → premium reasoning (max 10 in dropdown).
 */
export const PREFERRED_QUICK_PICK_MODEL_IDS: readonly string[] = [
  "openrouter/free",
  "openai/gpt-4o",
  "openai/gpt-5-mini",
  "openai/gpt-5-nano",
  "anthropic/claude-sonnet-4.5",
  "anthropic/claude-opus-4.6",
  "google/gemini-2.5-flash-lite",
  "google/gemini-2.5-pro",
  "x-ai/grok-4.20",
  "deepseek/deepseek-v3.1-terminus",
];

export const MAX_QUICK_PICK_COUNT = 10;

/** Max width for the composer quick-pick dropdown (trigger-aligned, not full modal width). */
export const QUICK_PICK_DROPDOWN_MAX_WIDTH = 260;

export const QUICK_PICKS_USER_EMPTIED_KEY = "nobox-quick-picks-user-emptied";
export const QUICK_PICKS_DEFAULTS_MERGED_KEY = "nobox-quick-picks-defaults-merged-v2";

export function readQuickPicksUserEmptied(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(QUICK_PICKS_USER_EMPTIED_KEY) === "1";
}

export function markQuickPicksUserEmptied(): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(QUICK_PICKS_USER_EMPTIED_KEY, "1");
}

export function clearQuickPicksUserEmptied(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(QUICK_PICKS_USER_EMPTIED_KEY);
}

export function readQuickPicksDefaultsMerged(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(QUICK_PICKS_DEFAULTS_MERGED_KEY) === "1";
}

export function markQuickPicksDefaultsMerged(): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(QUICK_PICKS_DEFAULTS_MERGED_KEY, "1");
}

/**
 * Resolves platform default quick-pick IDs against the live model catalog.
 * Falls back to featured models when preferred IDs are unavailable.
 */
export function resolveDefaultQuickPickModelIds(models: Model[]): string[] {
  const availableIds = new Set(models.map((m) => m.id));
  const resolved: string[] = [];

  for (const id of PREFERRED_QUICK_PICK_MODEL_IDS) {
    if (availableIds.has(id) && !resolved.includes(id)) {
      resolved.push(id);
    }
  }

  for (const model of models) {
    if (model.featured && !resolved.includes(model.id)) {
      resolved.push(model.id);
    }
  }

  return resolved.slice(0, MAX_QUICK_PICK_COUNT);
}

/**
 * Maps ordered quick-pick IDs to model objects (unknown IDs are skipped).
 */
export function mapQuickPickModels(models: Model[], quickPickIds: string[]): Model[] {
  const byId = new Map(models.map((m) => [m.id, m]));
  return quickPickIds
    .map((id) => byId.get(id))
    .filter((m): m is Model => m != null);
}

/**
 * Merges curated defaults with saved quick picks (defaults first, then extras).
 */
export function mergeDefaultsWithSavedQuickPicks(
  models: Model[],
  savedIds: string[],
): string[] {
  const defaults = resolveDefaultQuickPickModelIds(models);
  const extras = savedIds.filter((id) => !defaults.includes(id));
  return [...defaults, ...extras];
}

/**
 * Legacy account: favorites exist but none of the curated platform defaults are saved yet.
 */
export function shouldMigrateLegacyFavoritesToQuickPicks(
  models: Model[],
  savedIds: string[],
): boolean {
  if (savedIds.length === 0) return false;
  const availableIds = new Set(models.map((m) => m.id));
  const curatedInCatalog = PREFERRED_QUICK_PICK_MODEL_IDS.filter((id) =>
    availableIds.has(id),
  );
  if (curatedInCatalog.length === 0) return false;
  return !curatedInCatalog.some((id) => savedIds.includes(id));
}

/**
 * Active quick-pick IDs for dropdown + switches — always follows backend saved list.
 */
export function mergeQuickPickIdsForDisplay(
  models: Model[],
  savedIds: string[],
): string[] {
  if (readQuickPicksUserEmptied() && savedIds.length === 0) {
    return [];
  }

  const defaults = resolveDefaultQuickPickModelIds(models);
  const extras = savedIds.filter((id) => !defaults.includes(id));

  if (savedIds.length === 0 && !readQuickPicksUserEmptied()) {
    return defaults;
  }

  const enabledDefaults = defaults.filter((id) => savedIds.includes(id));
  return [...enabledDefaults, ...extras];
}

/**
 * IDs shown in the composer dropdown.
 */
export function resolveQuickPickModelIdsForDisplay(
  models: Model[],
  savedIds: string[],
  favoritesLoaded: boolean,
): string[] {
  if (!favoritesLoaded) {
    return resolveDefaultQuickPickModelIds(models);
  }
  return mergeQuickPickIdsForDisplay(models, savedIds);
}

export function resolveQuickPickModelsForDisplay(
  models: Model[],
  savedIds: string[],
  favoritesLoaded: boolean,
): Model[] {
  return mapQuickPickModels(
    models,
    resolveQuickPickModelIdsForDisplay(models, savedIds, favoritesLoaded),
  );
}
