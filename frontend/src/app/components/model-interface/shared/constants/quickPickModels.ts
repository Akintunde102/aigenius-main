import type { Model } from "@/app/components/model-interface/shared/types";

/**
 * Curated default quick-pick models — one strong option per major lab plus free/fast tiers.
 * Order: free → daily drivers → one alternative (max 6 in dropdown).
 */
export const PREFERRED_QUICK_PICK_MODEL_IDS: readonly string[] = [
  "openrouter/free",
  "openai/gpt-4o",
  "openai/gpt-5-mini",
  "anthropic/claude-sonnet-4.5",
  "google/gemini-2.5-flash-lite",
  "deepseek/deepseek-v3.1-terminus",
];

export const MAX_QUICK_PICK_COUNT = 6;

/** Min width for the composer quick-pick dropdown (wider than narrow trigger for model names). */
export const QUICK_PICK_DROPDOWN_MIN_WIDTH = 200;

/** Max width for the composer quick-pick dropdown (trigger-aligned, not full modal width). */
export const QUICK_PICK_DROPDOWN_MAX_WIDTH = 300;

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
 * Uses only models marked featured: true in the backend catalog.
 */
export function resolveDefaultQuickPickModelIds(models: Model[]): string[] {
  const resolved: string[] = [];

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

export function isModelInCatalog(models: Model[], modelId: string): boolean {
  return models.some((m) => m.id === modelId);
}

/**
 * First sensible active model when the current choice is missing from the catalog.
 */
export function resolveFallbackActiveModel(
  models: Model[],
  savedIds: string[],
  favoritesLoaded: boolean,
): Model | null {
  if (models.length === 0) return null;

  const displayIds = resolveQuickPickModelIdsForDisplay(
    models,
    savedIds,
    favoritesLoaded,
  );
  for (const id of displayIds) {
    const match = models.find((m) => m.id === id);
    if (match) return match;
  }

  for (const id of resolveDefaultQuickPickModelIds(models)) {
    const match = models.find((m) => m.id === id);
    if (match) return match;
  }

  return models[0] ?? null;
}

/**
 * Keeps a valid catalog model as active; replaces only when the id is unavailable.
 */
export function reconcileActiveModelSelection(
  models: Model[],
  active: Model | null,
  savedIds: string[],
  favoritesLoaded: boolean,
): { model: Model | null; replacedUnavailable: boolean } {
  if (!active) {
    return { model: null, replacedUnavailable: false };
  }

  if (isModelInCatalog(models, active.id)) {
    return { model: active, replacedUnavailable: false };
  }

  const fallback = resolveFallbackActiveModel(models, savedIds, favoritesLoaded);
  return {
    model: fallback,
    replacedUnavailable: fallback != null,
  };
}

export function isActiveModelOutsideQuickPicks(
  active: Model | null,
  quickPickIds: string[],
): boolean {
  if (!active) return false;
  return !quickPickIds.includes(active.id);
}
