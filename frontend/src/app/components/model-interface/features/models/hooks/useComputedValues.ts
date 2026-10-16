import { useMemo, useDeferredValue } from 'react';
import { Model, ChatMessage } from '@/app/components/model-interface/shared/types';
import { filterModelsNew, sortModelsNew } from '@/app/components/model-interface/shared/utils';
import type { ModelOrderBy, ModelOrderDir } from '@/app/components/model-interface/shared/utils';

interface UseComputedValuesProps {
    models: Model[];
    chat: ChatMessage[];
    selectedModel: Model | null;
    search: string;
    showWebSearch: boolean;
    imageFilterOnly?: boolean;
    orderBy?: ModelOrderBy;
    orderDir?: ModelOrderDir;
    selectedProviders?: string[];
}

export function useComputedValues({
    models,
    chat,
    selectedModel,
    search,
    showWebSearch,
    imageFilterOnly = false,
    orderBy = 'default',
    orderDir = 'asc',
    selectedProviders = []
}: UseComputedValuesProps) {
    const deferredSearch = useDeferredValue(search);

    const filteredModels = useMemo(() =>
        models.filter(m =>
        (m.name?.toLowerCase().includes(deferredSearch.toLowerCase()) ||
            m.id?.toLowerCase().includes(deferredSearch.toLowerCase()))
        ), [models, deferredSearch]
    );

    const modalFilteredModels = useMemo(
        () => filterModelsNew(models, deferredSearch, selectedProviders, imageFilterOnly, showWebSearch),
        [models, deferredSearch, selectedProviders, imageFilterOnly, showWebSearch],
    );

    const modalSortedModels = useMemo(
        () => sortModelsNew(modalFilteredModels, orderBy, orderDir),
        [modalFilteredModels, orderBy, orderDir],
    );

    const sumChatCostCredits = useMemo(
        () => chat.reduce(
            (sum, msg) => sum + (typeof msg.cost_credits === 'number' ? msg.cost_credits : 0),
            0,
        ),
        [chat],
    );

    /** @deprecated Legacy name; value is platform credits, not USD. */
    const currentChatCostUSD = sumChatCostCredits;
    const currentChatCostNaira = sumChatCostCredits;

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
