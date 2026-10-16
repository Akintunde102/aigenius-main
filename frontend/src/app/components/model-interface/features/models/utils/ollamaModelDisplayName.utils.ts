const DEFAULT_RUNTIME_APP = 'Ollama';
const OLLAMA_CLOUD_RUNTIME_APP = 'Ollama Cloud';

export function isOllamaCatalogId(id: string | undefined | null): boolean {
    if (!id) return false;
    return id.startsWith('ollama:') || id.startsWith('ollama/');
}

function stripOllamaCatalogPrefix(name: string): string {
    if (name.startsWith('ollama:')) return name.slice('ollama:'.length);
    if (name.startsWith('ollama/')) return name.slice('ollama/'.length);
    return name;
}

/** Local Ollama tag vs Ollama Cloud (`:cloud` / `-cloud` wire ids). */
export function resolveOllamaRuntimeAppName(catalogId: string | undefined | null): string {
    if (!catalogId) return DEFAULT_RUNTIME_APP;
    const wire = stripOllamaCatalogPrefix(catalogId).trim().toLowerCase();
    if (wire.endsWith(':cloud') || wire.endsWith('-cloud')) {
        return OLLAMA_CLOUD_RUNTIME_APP;
    }
    return DEFAULT_RUNTIME_APP;
}

export function getOllamaModelDisplayName(model: { id?: string; name?: string }): string {
    const appName = resolveOllamaRuntimeAppName(model.id);
    return formatLocalRuntimeModelName(model.name || model.id || '', appName);
}

/**
 * Display name for an Ollama or other local runtime model.
 * Keeps an existing app prefix (for example "Ollama Cloud: GLM-5.1").
 */
export function formatLocalRuntimeModelName(
    rawName: string,
    appName: string = DEFAULT_RUNTIME_APP,
): string {
    const name = stripOllamaCatalogPrefix(rawName.trim()).trim();
    if (!name) return appName;
    if (name.toLowerCase().startsWith(appName.toLowerCase())) return name;
    return `${appName}: ${name}`;
}

export function withLocalRuntimeDisplayName<T extends { id?: string; name?: string; provider?: string }>(
    model: T,
): T {
    const isLocalRuntime = model.provider === 'ollama' || isOllamaCatalogId(model.id);
    if (!isLocalRuntime) return model;
    const appName = resolveOllamaRuntimeAppName(model.id);
    const nextName = formatLocalRuntimeModelName(model.name || model.id || '', appName);
    if (nextName === model.name) return model;
    return { ...model, name: nextName };
}
