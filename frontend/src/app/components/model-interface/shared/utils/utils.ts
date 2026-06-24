import { Model } from "@/app/components/model-interface/shared/types";

export const USD_TO_NGN = 1400;

// Helper to get the lowest price for a model
export function getModelLowestPrice(model: Model): number {
  if (!model.pricing) return Infinity;
  const prices = Object.values(model.pricing)
    .map((v) => parseFloat(v))
    .filter((v) => !isNaN(v));
  if (!prices.length) return Infinity;
  return Math.min(...prices);
}

// Helper to get the lowest per-token price for a model (in dollars)
export function getModelLowestTokenPrice(model: Model): number {
  if (!model.pricing) return Infinity;

  // Look for common pricing keys that might be per-token
  const perTokenKeys = ["input", "output", "prompt", "completion", "tokens"];
  let minPrice = Infinity;

  for (const [key, value] of Object.entries(model.pricing)) {
    const price = parseFloat(value);
    if (!isNaN(price) && price > 0) {
      // If the key suggests it's per-token, use it directly
      if (
        perTokenKeys.some((tokenKey) => key.toLowerCase().includes(tokenKey))
      ) {
        minPrice = Math.min(minPrice, price);
      }
      // Also check if it's a reasonable per-token price (usually very small numbers)
      else if (price < 0.1) {
        minPrice = Math.min(minPrice, price);
      }
    }
  }

  return minPrice === Infinity ? 0 : minPrice;
}

// Helper to estimate average price per request (assume 800 tokens)
export function getModelAverageRequestPrice(
  model: Model,
  avgTokens = 800,
): number {
  // Prefer backend-provided averageUserSpendPerRequest when available
  const backendAvg = model?.averageUserSpendPerRequest?.totalAverageCost;
  if (
    typeof backendAvg === "number" &&
    isFinite(backendAvg) &&
    backendAvg > 0
  ) {
    return backendAvg;
  }

  // Check if there's a direct per-request price
  if (model.pricing?.request) {
    const requestPrice = parseFloat(model.pricing.request);
    if (!isNaN(requestPrice) && requestPrice > 0) {
      return requestPrice;
    }
  }

  // Fallback: estimate based on lowest per-token price
  const perToken = getModelLowestTokenPrice(model);
  if (!isFinite(perToken) || perToken === 0) return 0;
  return perToken * avgTokens;
}

export function formatUSD(value: number): string {
  if (!isFinite(value)) return "$0.00";
  return `$${value.toFixed(4)}`;
}

export function formatNGN(valueUSD: number, withoutSymbol = false): string {
  if (!isFinite(valueUSD)) return "₦0";
  const naira = valueUSD * USD_TO_NGN;
  return `${withoutSymbol ? "" : "₦"}${naira.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

// Helper to check if model supports extra tooling (function calling, Gmail, Keep, etc.)
export function hasExtraToolingCapability(model: Model): boolean {
  if (model.supports_tools === true) return true;
  const params = model.supported_parameters as string[] | undefined;
  return Array.isArray(params) && params.includes("tools");
}

// Helper to check if model has web search capability
export function hasWebSearchCapability(model: Model): boolean {
  // Check pricing metadata (official OpenRouter/Backend indicator)
  // OpenRouter now reliably populates `pricing.web_search` for all models
  // that support native web search (OpenAI, Anthropic, Perplexity, xAI)
  const webSearchPrice = model.pricing?.web_search;
  const webSearchValue = webSearchPrice ? parseFloat(webSearchPrice) : 0;

  return !isNaN(webSearchValue) && webSearchValue > 0;
}


// Filter models based on search and filters
export function filterModels(
  models: Model[],
  search: string,
  selectedModalities: string[],
  selectedOutputModalities: string[],
  showWebSearch: boolean,
  showToolsOnly = false,
  imageFilterOnly = false,
): Model[] {
  const searchLower = search.toLowerCase().trim();
  const searchImpliesTools =
    searchLower === "tools" || searchLower === "tooling";

  return models.filter((m) => {
    const textMatch =
      m.name?.toLowerCase().includes(searchLower) ||
      m.id?.toLowerCase().includes(searchLower) ||
      m.architecture?.input_modalities
        ?.filter((mod: string) => (mod || "").toLowerCase() !== "text")
        .some((mod: string) => mod.toLowerCase().includes(searchLower)) ||
      m.architecture?.output_modalities
        ?.filter((mod: string) => (mod || "").toLowerCase() !== "text")
        .some((mod: string) => mod.toLowerCase().includes(searchLower));
    const matchesSearch =
      textMatch || (searchImpliesTools && hasExtraToolingCapability(m));
    const matchesImageOnly = !imageFilterOnly || hasImageSupport(m);
    const matchesInputModality = imageFilterOnly
      ? true
      : selectedModalities.length === 0 ||
      m.architecture?.input_modalities
        ?.filter((mod: string) => (mod || "").toLowerCase() !== "text")
        .some((mod: string) => selectedModalities.includes(mod));
    const matchesOutputModality = imageFilterOnly
      ? true
      : selectedOutputModalities.length === 0 ||
      m.architecture?.output_modalities
        ?.filter((mod: string) => (mod || "").toLowerCase() !== "text")
        .some((mod: string) => selectedOutputModalities.includes(mod));
    const matchesWebSearch = !showWebSearch || hasWebSearchCapability(m);
    const toolsFilter = showToolsOnly || searchImpliesTools;
    const matchesTools = !toolsFilter || hasExtraToolingCapability(m);
    return (
      matchesSearch &&
      matchesImageOnly &&
      matchesInputModality &&
      matchesOutputModality &&
      matchesWebSearch &&
      matchesTools
    );
  });
}

// Sort models by cost
export function sortModelsByCost(
  models: Model[],
  orderByCost: "none" | "asc" | "desc",
): Model[] {
  if (orderByCost === "none") return models;
  return [...models].sort((a, b) => {
    const priceA = getModelAverageRequestPrice(a); // use average request price for better UX
    const priceB = getModelAverageRequestPrice(b);
    return orderByCost === "asc" ? priceA - priceB : priceB - priceA;
  });
}

// Extract all modalities from models
export function extractModalities(models: Model[]): {
  inputModalities: string[];
  outputModalities: string[];
} {
  const inputModalities = new Set<string>();
  const outputModalities = new Set<string>();

  models.forEach((m) => {
    m.architecture?.input_modalities?.forEach((mod: string) => {
      if ((mod || "").toLowerCase() !== "text") inputModalities.add(mod);
    });
    m.architecture?.output_modalities?.forEach((mod: string) => {
      if ((mod || "").toLowerCase() !== "text") outputModalities.add(mod);
    });
  });

  return {
    inputModalities: Array.from(inputModalities),
    outputModalities: Array.from(outputModalities),
  };
}

// --- New filter/sort (used when SHOW_LEGACY_FILTERS is false) ---

/** Provider id from model id (e.g. "openai/gpt-5" -> "openai"). */
export function getProvider(id: string): string {
  if (!id || typeof id !== "string") return "";
  const part = id.split("/")[0]?.trim();
  return part || "";
}

/** Human-readable provider label (e.g. "openai" -> "OpenAI"). */
export function getProviderLabel(providerId: string): string {
  if (!providerId) return "";
  const known: Record<string, string> = {
    openai: "OpenAI",
    anthropic: "Anthropic",
    google: "Google",
    "x-ai": "xAI",
    "z-ai": "Z-AI",
    qwen: "Qwen",
    deepseek: "DeepSeek",
    mistralai: "Mistral",
    meta: "Meta",
    perplexity: "Perplexity",
    openrouter: "OpenRouter",
    cohere: "Cohere",
    amazon: "Amazon",
    microsoft: "Microsoft",
  };
  return (
    known[providerId] ||
    providerId.charAt(0).toUpperCase() + providerId.slice(1).toLowerCase()
  );
}

/** Display name for a model: use generic "Free" instead of "openrouter/free". */
export function getModelDisplayName(model: Model): string {
  const id = model?.id ?? "";
  const provider = getProvider(id);
  const slug = id.split("/")[1]?.trim().toLowerCase();
  if (
    provider === "openrouter" &&
    (slug === "free" || (model?.name?.toLowerCase?.() ?? "").includes("free"))
  ) {
    return "Free";
  }
  return (model?.name ?? id) || "";
}

/** Biggest/major labs for the provider filter, in display order. (Grok = xAI.) */
export const MAJOR_PROVIDER_IDS: string[] = [
  "google", // Google
  "x-ai", // Grok / xAI
  "openai", // OpenAI
  "anthropic", // Anthropic
  "meta", // Meta
  "deepseek", // DeepSeek
  "perplexity", // Perplexity
];

/** Provider ids that are in the major list and present in availableProviders, in major order. */
export function getMajorProviders(availableProviders: string[]): string[] {
  const set = new Set(availableProviders);
  return MAJOR_PROVIDER_IDS.filter((pid) => set.has(pid));
}

/** Display info for a modality (for ModalityIcon component). */
export function getModalityDisplay(mod: string): {
  iconKey: "image" | "audio" | "video" | "other";
  label: string;
} {
  const lower = (mod || "").toLowerCase();
  if (lower.includes("image") || lower.includes("image_url"))
    return { iconKey: "image", label: "Image" };
  if (lower.includes("audio") || lower.includes("speech"))
    return { iconKey: "audio", label: "Audio" };
  if (lower.includes("video")) return { iconKey: "video", label: "Video" };
  return { iconKey: "other", label: mod || "Other" };
}

/** True if model supports image output (can generate/return images). */
export function hasImageSupport(m: Model): boolean {
  const has = (mod: string) => (mod || "").toLowerCase().includes("image");
  const arch = m.architecture;
  if (arch?.output_modalities?.some(has)) return true;
  const rootOutput =
    (m as { output_modalities?: string[] }).output_modalities ?? [];
  return rootOutput.some(has);
}

/** Unique sorted provider ids from models. */
export function extractProviders(models: Model[]): string[] {
  const set = new Set<string>();
  models.forEach((m) => {
    const p = getProvider(m.id);
    if (p) set.add(p);
  });
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

/** Tokenize string for robust matching (splits by non-alphanumeric, lowercase). */
export function tokenize(str: string): string[] {
  if (!str) return [];
  return str
    .toLowerCase()
    .split(/[^a-z0-9]/) // Fixed regex to include 0-9 correctly
    .filter((t) => t.length > 0);
}

/** Helper to get or create cached tokens for a model. */
function getCachedTokens(model: any, field: string, value: string): string[] {
  const cacheKey = `_tokens_${field}`;
  if (!model[cacheKey] || model[`_${field}_raw`] !== value) {
    model[cacheKey] = tokenize(value);
    model[`_${field}_raw`] = value; // Store raw value to detect changes
  }
  return model[cacheKey];
}

/** Calculate relevance score (0-100) based on token matches in name, id, description. */
export function calculateRelevance(model: Model, searchTokens: string[]): number {
  if (searchTokens.length === 0) return 0;

  const m = model as any;
  const nameTokens = getCachedTokens(m, 'name', model.name);
  const idTokens = getCachedTokens(m, 'id', model.id);
  const descTokens = getCachedTokens(m, 'description', model.description || "");
  const subtitleTokens = getCachedTokens(m, 'subtitle', model.subtitle || "");

  let score = 0;
  for (const token of searchTokens) {
    // Exact match in name is highest priority
    if (nameTokens.includes(token)) score += 40 / searchTokens.length;
    else if (nameTokens.some(t => t.startsWith(token))) score += 20 / searchTokens.length;

    // ID match
    if (idTokens.includes(token)) score += 25 / searchTokens.length;
    
    // Subtitle match
    if (subtitleTokens.includes(token)) score += 15 / searchTokens.length;

    // Description match
    if (descTokens.includes(token)) score += 10 / searchTokens.length;
    else if (descTokens.some(t => t.includes(token))) score += 5 / searchTokens.length;
  }

  return Math.min(score, 100);
}

/** New filter: token-based search (name, id, description, subtitle), provider, optional image-only, optional web-search. */
export function filterModelsNew(
  models: Model[],
  search: string,
  selectedProviders: string[],
  imageFilterOnly = false,
  showWebSearch = false,
): Model[] {
  const searchTokens = tokenize(search);
  
  const filtered = models.filter((m) => {
    const provider = getProvider(m.id);
    const matchesProvider =
      selectedProviders.length === 0 || selectedProviders.includes(provider);
    const matchesImageOnly = !imageFilterOnly || hasImageSupport(m);
    const matchesWebSearch = !showWebSearch || hasWebSearchCapability(m);
    
    if (!matchesProvider || !matchesImageOnly || !matchesWebSearch) return false;
    if (searchTokens.length === 0) return true;

    // Use cached tokens for faster filtering if possible, or just use string includes fallback
    const mAny = m as any;
    const nameStr = (m.name || "").toLowerCase();
    const idStr = (m.id || "").toLowerCase();
    const descStr = (m.description || "").toLowerCase();
    const subtitleStr = (m.subtitle || "").toLowerCase();

    return searchTokens.every(token => 
      nameStr.includes(token) || 
      idStr.includes(token) || 
      descStr.includes(token) || 
      subtitleStr.includes(token)
    );
  });

  // Attach search score for sorting if searching
  if (searchTokens.length > 0) {
    filtered.forEach(m => {
      (m as any)._searchScore = calculateRelevance(m, searchTokens);
    });
  } else {
    filtered.forEach(m => delete (m as any)._searchScore);
  }

  return filtered;
}

export type ModelOrderBy = "default" | "cost" | "provider" | "context" | "name" | "release_date" | "relevance";
export type ModelOrderDir = "asc" | "desc";

/** New sort: default (featured first, then rest), cost, provider, context length, name, relevance. */
export function sortModelsNew(
  models: Model[],
  orderBy: ModelOrderBy,
  orderDir: ModelOrderDir,
): Model[] {
  // If we have search scores and sorting is default or relevance, prioritize relevance
  const hasScores = models.some(m => (m as any)._searchScore !== undefined);
  
  if (orderBy === "default") {
    if (hasScores) {
      return [...models].sort((a, b) => ((b as any)._searchScore || 0) - ((a as any)._searchScore || 0));
    }
    // Featured models come first in their original relative order,
    // followed by non-featured in their original relative order.
    const featured = models.filter((m) => m.featured === true);
    const rest = models.filter((m) => m.featured !== true);
    return [...featured, ...rest];
  }
  const dir = orderDir === "asc" ? 1 : -1;
  return [...models].sort((a, b) => {
    if (orderBy === "cost") {
      const pa = getModelAverageRequestPrice(a);
      const pb = getModelAverageRequestPrice(b);
      return (pa - pb) * dir;
    }
    if (orderBy === "provider") {
      const pa = getProviderLabel(getProvider(a.id));
      const pb = getProviderLabel(getProvider(b.id));
      return pa.localeCompare(pb) * dir;
    }
    if (orderBy === "context") {
      const ca = typeof a.context_length === "number" ? a.context_length : 0;
      const cb = typeof b.context_length === "number" ? b.context_length : 0;
      return (ca - cb) * dir;
    }
    if (orderBy === "name") {
      const na = (a.name || a.id || "").toLowerCase();
      const nb = (b.name || b.id || "").toLowerCase();
      return na.localeCompare(nb) * dir;
    }
    if (orderBy === "release_date") {
      const da = typeof a.created === "number" ? a.created : 0;
      const db = typeof b.created === "number" ? b.created : 0;
      return (da - db) * dir;
    }
    return 0;
  });
}
