const DEFAULT_RUNTIME_APP = 'Ollama';

export function isOllamaCatalogId(id: string | undefined | null): boolean {
    if (!id) return false;
    return id.startsWith('ollama:') || id.startsWith('ollama/');
}

function stripOllamaCatalogPrefix(name: string): string {
    if (name.startsWith('ollama:')) return name.slice('ollama:'.length);
    if (name.startsWith('ollama/')) return name.slice('ollama/'.length);
    return name;
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
    appName: string = DEFAULT_RUNTIME_APP,
): T {
    const isLocalRuntime = model.provider === 'ollama' || isOllamaCatalogId(model.id);
    if (!isLocalRuntime) return model;
    const nextName = formatLocalRuntimeModelName(model.name || model.id || '', appName);
    if (nextName === model.name) return model;
    return { ...model, name: nextName };
}
