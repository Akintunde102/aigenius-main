import { useMemo, useDeferredValue } from 'react';
import { Model, ChatMessage } from '@/app/components/model-interface/shared/types';
import { filterModels, sortModelsByCost, filterModelsNew, sortModelsNew, USD_TO_NGN } from '@/app/components/model-interface/shared/utils';
import { SHOW_LEGACY_FILTERS } from '@/app/components/model-interface/shared/constants';
import type { ModelOrderBy, ModelOrderDir } from '@/app/components/model-interface/shared/utils';

interface UseComputedValuesProps {
    models: Model[];
    chat: ChatMessage[];
    selectedModel: Model | null;
    search: string;
    selectedModalities: string[];
    selectedOutputModalities: string[];
    showWebSearch: boolean;
    showToolsOnly: boolean;
    orderByCost: 'none' | 'asc' | 'desc';
    imageFilterOnly?: boolean;
    // New filter/sort (used when !SHOW_LEGACY_FILTERS)
    orderBy?: ModelOrderBy;
    orderDir?: ModelOrderDir;
    selectedProviders?: string[];
}

export function useComputedValues({
    models,
    chat,
    selectedModel,
    search,
    selectedModalities,
    selectedOutputModalities,
    showWebSearch,
    showToolsOnly,
    orderByCost,
    imageFilterOnly = false,
    orderBy = 'default',
    orderDir = 'asc',
    selectedProviders = []
}: UseComputedValuesProps) {
    // Use deferred value for search to keep the UI responsive while filtering
    const deferredSearch = useDeferredValue(search);

    const filteredModels = useMemo(() =>
        models.filter(m =>
        (m.name?.toLowerCase().includes(deferredSearch.toLowerCase()) ||
            m.id?.toLowerCase().includes(deferredSearch.toLowerCase()))
        ), [models, deferredSearch]
    );

    const modalFilteredModels = useMemo(() => {
        if (SHOW_LEGACY_FILTERS) {
            return filterModels(
                models,
                deferredSearch,
                selectedModalities,
                selectedOutputModalities,
                showWebSearch,
                showToolsOnly,
                imageFilterOnly
            );
        }
        return filterModelsNew(models, deferredSearch, selectedProviders, imageFilterOnly, showWebSearch);
    }, [models, deferredSearch, selectedModalities, selectedOutputModalities, showWebSearch, showToolsOnly, selectedProviders, imageFilterOnly]);

    const modalSortedModels = useMemo(() => {
        if (SHOW_LEGACY_FILTERS) {
            return sortModelsByCost(modalFilteredModels, orderByCost);
        }
        return sortModelsNew(modalFilteredModels, orderBy, orderDir);
    }, [modalFilteredModels, orderByCost, orderBy, orderDir]);

    const currentChatCostUSD = useMemo(
        () => chat.reduce((sum, msg) => sum + (typeof msg.cost === 'number' ? msg.cost : 0), 0),
        [chat],
    );

    const currentChatCostNaira = useMemo(
        () => chat.reduce(
            (sum, msg) => sum + (typeof msg.cost === 'number' ? msg.cost * USD_TO_NGN : 0),
            0,
        ),
        [chat],
    );

    const supportsImageUpload = useMemo(() =>
        selectedModel?.architecture?.input_modalities?.some((mod: string) =>
            mod.toLowerCase().includes('image') || mod.toLowerCase().includes('file')
        ), [selectedModel]
    );

    return {
        filteredModels,
        modalFilteredModels,
        modalSortedModels,
        currentChatCostUSD,
        currentChatCostNaira,
        supportsImageUpload
    };
}
