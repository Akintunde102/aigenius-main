"use strict";
/**
 * Ollama Cloud wire/registry naming shared by the sidecar relay and live tests.
 * Catalog ids use the `ollama:` prefix; Ollama API uses `aigenius/<name>` registry tags.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.OLLAMA_LOCAL_BASE_URL = exports.OLLAMA_CLOUD_CATALOG_IDS = void 0;
exports.isOllamaCloudModel = isOllamaCloudModel;
exports.catalogIdToWireModel = catalogIdToWireModel;
exports.getOllamaRegistryModelName = getOllamaRegistryModelName;
exports.OLLAMA_CLOUD_CATALOG_IDS = [
    'ollama:glm-5.1:cloud',
    'ollama:qwen3-coder-next:cloud',
    'ollama:gpt-oss:120b-cloud',
    'ollama:deepseek-v3.2:cloud',
    'ollama:kimi-k2.6:cloud',
];
function isOllamaCloudModel(model) {
    return model.endsWith(':cloud') || model.endsWith('-cloud');
}
function catalogIdToWireModel(catalogId) {
    return catalogId.startsWith('ollama:') ? catalogId.slice('ollama:'.length) : catalogId;
}
function getOllamaRegistryModelName(model) {
    return model;
}
exports.OLLAMA_LOCAL_BASE_URL = (process.env.OLLAMA_HOST || 'http://localhost:11434').replace(/\/$/, '');
