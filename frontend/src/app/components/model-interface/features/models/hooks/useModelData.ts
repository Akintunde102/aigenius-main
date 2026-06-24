import { useState, useEffect } from 'react';
import { Model } from '@/app/components/model-interface/shared/types';
import { LINKS } from '@/lib/links';
import { authorizedRequest } from '@/lib/calls/request';
import { getTestingModelName, isTestingModelEnforced } from '@/lib/testing-model';
import { isAigeniusDesktopRuntime, getAigeniusDesktopBridgeFromBrowsingContext } from '@/lib/utils/desktop-runtime';

let inflightModelsPromise: Promise<any> | null = null;
let cachedModels: any[] | null = null;
let cachedModelsAt = 0;
const MODELS_TTL_MS = 10000;

const OLLAMA_CLOUD_MODELS: Model[] = [
    {
        id: 'ollama:glm-5.1:cloud',
        name: 'Ollama Cloud: GLM-5.1',
        provider: 'ollama',
        subtitle: 'Ollama Cloud - 198K context',
        description: 'Ollama Cloud model routed through your local signed-in Ollama app.',
        context_length: 198000,
        architecture: { modality: 'text', input_modalities: ['text'], output_modalities: ['text'] },
        supportsTools: true,
        supports_tools: true,
    },
    {
        id: 'ollama:qwen3-coder-next:cloud',
        name: 'Ollama Cloud: Qwen3 Coder Next',
        provider: 'ollama',
        subtitle: 'Ollama Cloud - 256K context',
        description: 'Coding-focused Ollama Cloud model routed through your local signed-in Ollama app.',
        context_length: 256000,
        architecture: { modality: 'text', input_modalities: ['text'], output_modalities: ['text'] },
        supportsTools: true,
        supports_tools: true,
    },
    {
        id: 'ollama:gpt-oss:120b-cloud',
        name: 'Ollama Cloud: GPT-OSS 120B',
        provider: 'ollama',
        subtitle: 'Ollama Cloud',
        description: 'Large Ollama Cloud model routed through your local signed-in Ollama app.',
        context_length: 128000,
        architecture: { modality: 'text', input_modalities: ['text'], output_modalities: ['text'] },
        supportsTools: true,
        supports_tools: true,
    },
    {
        id: 'ollama:deepseek-v3.2:cloud',
        name: 'Ollama Cloud: DeepSeek V3.2',
        provider: 'ollama',
        subtitle: 'Ollama Cloud',
        description: 'Reasoning Ollama Cloud model routed through your local signed-in Ollama app.',
        context_length: 128000,
        architecture: { modality: 'text', input_modalities: ['text'], output_modalities: ['text'] },
        supportsTools: true,
        supports_tools: true,
    },
    {
        id: 'ollama:kimi-k2.6:cloud',
        name: 'Ollama Cloud: Kimi K2.6',
        provider: 'ollama',
        subtitle: 'Ollama Cloud',
        description: 'Agentic Ollama Cloud model routed through your local signed-in Ollama app.',
        context_length: 128000,
        architecture: { modality: 'text', input_modalities: ['text'], output_modalities: ['text'] },
        supportsTools: true,
        supports_tools: true,
    },
];

function mergeUniqueModels(models: any[], additions: Model[]): any[] {
    const existingIds = new Set(models.map((model) => model.id));
    return [
        ...models,
        ...additions.filter((model) => !existingIds.has(model.id)),
    ];
}

export function useModelData() {
    const [models, setModels] = useState<Model[]>([]);
    const [modelsLoading, setModelsLoading] = useState(true);
    const [selectedModel, setSelectedModel] = useState<Model | null>(null);
    const [error, setError] = useState("");

    const [recentModelIds, setRecentModelIds] = useState<string[]>([]);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const stored = localStorage.getItem('nobox-recent-model-ids');
            if (stored) setRecentModelIds(JSON.parse(stored));
        }
    }, []);

    useEffect(() => {
        if (selectedModel && typeof window !== 'undefined') {
            setRecentModelIds(prev => {
                const filtered = prev.filter(id => id !== selectedModel.id);
                const updated = [selectedModel.id, ...filtered].slice(0, 5);
                localStorage.setItem('nobox-recent-model-ids', JSON.stringify(updated));
                return updated;
            });
        }
    }, [selectedModel]);

    const recentModels = recentModelIds.map(id =>
        models.find(m => m.id === id)
    ).filter((m): m is Model => Boolean(m));

    // Load models (deduped/cached)
    useEffect(() => {
        let cancelled = false;
        const run = async () => {
            const now = Date.now();
            const hasFreshCache = Boolean(cachedModels && now - cachedModelsAt < MODELS_TTL_MS);
            if (!hasFreshCache) {
                setModelsLoading(true);
            }
            try {
                let list: any[] = [];
                if (hasFreshCache && cachedModels) {
                    list = cachedModels;
                } else {
                    if (!inflightModelsPromise) {
                        inflightModelsPromise = (async () => {
                            try {
                                const data = await authorizedRequest<any>({
                                    call: 'getGatewayModelChatsModels',
                                });
                                // API returns { data: Model[] } — extract the array
                                const raw = data?.data ?? data;
                                const modelsList = Array.isArray(raw) ? raw : [];
                                cachedModels = modelsList;
                                cachedModelsAt = Date.now();
                                return modelsList;
                            } catch (err) {
                                console.warn('Failed to fetch cloud models (might be offline):', err);
                                return [];
                            }
                        })()
                            .finally(() => {
                                inflightModelsPromise = null;
                            });
                    }
                    list = await inflightModelsPromise;
                }

                // Append local Ollama models if on desktop
                if (isAigeniusDesktopRuntime()) {
                    try {
                        const bridge = getAigeniusDesktopBridgeFromBrowsingContext();
                        if (bridge?.runLocalDesktopTool) {
                            const ollamaRes = await bridge.runLocalDesktopTool({ tool: 'local_ollama_status', arguments: {} });
                            if (ollamaRes.ok && ollamaRes.rawData?.models) {
                                const ollamaModels = ollamaRes.rawData.models.map((m: any) => ({
                                    id: `ollama:${m.name}`,
                                    name: m.name,
                                    provider: 'ollama',
                                    description: `Ollama local model: ${m.name} (${m.details?.family || 'unknown family'}, ${m.details?.parameter_size || 'unknown size'}, ${m.details?.quantization_level || 'unknown quantization'})`,
                                    costPerToken: 0,
                                    modalities: ['text'],
                                    outputModalities: ['text'],
                                    supportsWebSearch: false,
                                    supportsTools: false,
                                    supportsImageUpload: m.details?.family?.toLowerCase().includes('clip') || m.details?.family?.toLowerCase().includes('vision') || false,
                                }));
                                list = mergeUniqueModels(list, ollamaModels);
                            }
                            list = mergeUniqueModels(list, OLLAMA_CLOUD_MODELS);
                        }
                    } catch (err) {
                        console.warn('Failed to fetch local Ollama models:', err);
                        list = mergeUniqueModels(list, OLLAMA_CLOUD_MODELS);
                    }
                }

                if (!isAigeniusDesktopRuntime()) {
                    list = list.filter((m: any) => m.provider !== 'ollama' && !(m.id && m.id.startsWith('ollama:')));
                }

                if (!cancelled) setModels(list);

                // Model selection logic
                let lastModelId: string | null = null;
                if (typeof window !== 'undefined') {
                    lastModelId = localStorage.getItem('nobox-last-model-id');
                }

                let defaultModel: any = null;
                if (list && isTestingModelEnforced()) {
                    const forcedName = getTestingModelName().toLowerCase();
                    defaultModel = list.find((m: any) =>
                        (m?.name || '').toLowerCase() === forcedName
                        || (m?.name || '').toLowerCase().includes(forcedName),
                    );
                }
                if (!defaultModel && lastModelId && list) {
                    defaultModel = list.find((m: any) => m.id === lastModelId);
                }
                if (!defaultModel && list) {
                    // For first-time users, prioritize ChatGPT-4o
                    defaultModel = list.find((m: any) => m.id === 'openai/chatgpt-4o-latest');
                }
                if (!defaultModel && list) {
                    // Fallback to any GPT-4o model
                    defaultModel = list.find((m: any) =>
                        (m.id && m.id.toLowerCase().includes('gpt-4o')) ||
                        (m.name && m.name.toLowerCase().includes('gpt-4o'))
                    );
                }
                if (!defaultModel && list && list.length > 0) {
                    defaultModel = list[0];
                }
                if (defaultModel) setSelectedModel(defaultModel);
            } catch (error) {
                setError('Failed to load models. Please try again later.');
            } finally {
                if (!cancelled) setModelsLoading(false);
            }
        };
        run();
        return () => { cancelled = true; };
    }, []);

    // Persist selected model when changed
    useEffect(() => {
        if (selectedModel && typeof window !== 'undefined') {
            localStorage.setItem('nobox-last-model-id', selectedModel.id);
        }
    }, [selectedModel]);

    const getModelNameById = (id: string): string => {
        const model = models.find(m => m.id === id);
        return model?.name || id;
    };

    return {
        models,
        modelsLoading,
        selectedModel,
        setSelectedModel,
        recentModels,
        getModelNameById,
        error: error,
        setError
    };
}
