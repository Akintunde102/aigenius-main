/**
 * Ollama Cloud wire naming shared by the sidecar relay and live tests.
 * Catalog ids use the `ollama:` prefix; wire names match Ollama API model ids
 * (e.g. `glm-5.1:cloud`, `gpt-oss:120b-cloud`).
 */

export const OLLAMA_CLOUD_CATALOG_IDS = [
  'ollama:glm-5.1:cloud',
  'ollama:qwen3-coder-next:cloud',
  'ollama:gpt-oss:120b-cloud',
  'ollama:deepseek-v3.2:cloud',
  'ollama:kimi-k2.6:cloud',
] as const;

export type OllamaCloudCatalogId = (typeof OLLAMA_CLOUD_CATALOG_IDS)[number];

export function isOllamaCloudModel(model: string): boolean {
  return model.endsWith(':cloud') || model.endsWith('-cloud');
}

export function catalogIdToWireModel(catalogId: string): string {
  return catalogId.startsWith('ollama:') ? catalogId.slice('ollama:'.length) : catalogId;
}

export function getOllamaRegistryModelName(model: string): string {
  return model;
}

export function formatOllamaCloudError(detail: string): string {
  const normalized = detail.toLowerCase();
  if (
    normalized.includes('unauthorized')
    || normalized.includes('sign in')
    || normalized.includes('signin')
  ) {
    return 'Ollama Cloud requires sign-in. Run "ollama signin" in a terminal, complete browser authentication, then retry.';
  }
  return detail;
}

export const OLLAMA_LOCAL_BASE_URL =
  (process.env.OLLAMA_HOST || 'http://localhost:11434').replace(/\/$/, '');
