"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOllamaRegistryModelName = exports.catalogIdToWireModel = exports.OLLAMA_CLOUD_CATALOG_IDS = void 0;
exports.buildOllamaCloudLiveCases = buildOllamaCloudLiveCases;
exports.probeOllamaRunning = probeOllamaRunning;
exports.chatOllamaRegistryModel = chatOllamaRegistryModel;
const ollama_cloud_js_1 = require("./ollama-cloud.js");
Object.defineProperty(exports, "catalogIdToWireModel", { enumerable: true, get: function () { return ollama_cloud_js_1.catalogIdToWireModel; } });
Object.defineProperty(exports, "getOllamaRegistryModelName", { enumerable: true, get: function () { return ollama_cloud_js_1.getOllamaRegistryModelName; } });
Object.defineProperty(exports, "OLLAMA_CLOUD_CATALOG_IDS", { enumerable: true, get: function () { return ollama_cloud_js_1.OLLAMA_CLOUD_CATALOG_IDS; } });
function buildOllamaCloudLiveCases() {
    return ollama_cloud_js_1.OLLAMA_CLOUD_CATALOG_IDS.map((catalogId) => {
        const wireModel = (0, ollama_cloud_js_1.catalogIdToWireModel)(catalogId);
        return {
            catalogId,
            wireModel,
            registryModel: (0, ollama_cloud_js_1.getOllamaRegistryModelName)(wireModel),
        };
    });
}
async function probeOllamaRunning(timeoutMs = 4_000) {
    try {
        const res = await fetch(`${ollama_cloud_js_1.OLLAMA_LOCAL_BASE_URL}/api/tags`, {
            signal: AbortSignal.timeout(timeoutMs),
        });
        return res.ok;
    }
    catch {
        return false;
    }
}
async function chatOllamaRegistryModel(args) {
    const { registryModel, prompt, stream = false, timeoutMs = 120_000 } = args;
    const res = await fetch(`${ollama_cloud_js_1.OLLAMA_LOCAL_BASE_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model: registryModel,
            messages: [
                { role: 'system', content: 'Reply with exactly: OK' },
                { role: 'user', content: prompt },
            ],
            stream,
        }),
        signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) {
        const detail = await res.text().catch(() => res.statusText);
        throw new Error(`Ollama chat failed (${res.status}): ${detail.trim() || res.statusText}`);
    }
    if (!stream) {
        const data = (await res.json());
        return {
            content: data.message?.content?.trim() ?? '',
            done: data.done === true,
        };
    }
    if (!res.body) {
        throw new Error('Ollama chat returned no response body');
    }
    let content = '';
    let done = false;
    const reader = res.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';
    while (true) {
        const { value, done: readDone } = await reader.read();
        if (readDone) {
            break;
        }
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
            if (!line.trim()) {
                continue;
            }
            const parsed = JSON.parse(line);
            if (parsed.message?.content) {
                content += parsed.message.content;
            }
            if (parsed.done) {
                done = true;
            }
        }
    }
    if (buffer.trim()) {
        const parsed = JSON.parse(buffer);
        if (parsed.message?.content) {
            content += parsed.message.content;
        }
        if (parsed.done) {
            done = true;
        }
    }
    return { content: content.trim(), done };
}
