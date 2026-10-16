import React, { useState, useMemo, useEffect } from "react";
import { ModelSearchBar } from './ModelSearchBar';
import { ModelListItem } from './ModelListItem';
import { getPinnedModels, setPinnedModels, getDeletedModels, setDeletedModels } from '@/lib/utils/modelInterfaceUtils';
import { Model } from '@/app/components/model-interface/shared/types';
import { useLanguage } from '@/lib/providers/LanguageProvider';

interface ModelListSidebarOptimizedProps {
    models: Model[];
    selectedModel: Model | null;
    setSelectedModel: (model: Model) => void;
    search: string;
    setSearch: (s: string) => void;
    loading?: boolean;
    showModelList?: boolean;
    showModelDetails?: boolean;
    setShowModelList?: (v: boolean) => void;
    setShowModelDetails?: (v: boolean) => void;
    onShowModelDetails?: (model: Model) => void;
    hasWebSearchCapability?: (model: Model) => boolean;
    showNaira?: boolean;
}

export const ModelListSidebarOptimized: React.FC<ModelListSidebarOptimizedProps> = React.memo(({
    models,
    selectedModel,
    setSelectedModel,
    search,
    setSearch,
    loading = false,
    showModelList = true,
    onShowModelDetails,
    hasWebSearchCapability,
    showNaira = false
}) => {
    const { t } = useLanguage();
    const [pinnedModels, setPinnedModelsState] = useState<string[]>([]);
    const [deletedModels, setDeletedModelsState] = useState<string[]>([]);

    useEffect(() => {
        setPinnedModelsState(getPinnedModels());
        setDeletedModelsState(getDeletedModels());
    }, []);

    useEffect(() => {
        setPinnedModels(pinnedModels);
    }, [pinnedModels]);

    useEffect(() => {
        setDeletedModels(deletedModels);
    }, [deletedModels]);

    const filteredModels = useMemo(() => {
        const searchLower = search.toLowerCase();
        return models.filter(m => {
            if (deletedModels.includes(m.id)) return false;

            return (
                m.name?.toLowerCase().includes(searchLower) ||
                m.id?.toLowerCase().includes(searchLower) ||
                m.description?.toLowerCase().includes(searchLower) ||
                (m.architecture?.input_modalities?.filter((mod: string) => (mod || '').toLowerCase() !== 'text').some((mod: string) => mod.toLowerCase().includes(searchLower))) ||
                (m.architecture?.output_modalities?.filter((mod: string) => (mod || '').toLowerCase() !== 'text').some((mod: string) => mod.toLowerCase().includes(searchLower)))
            );
        });
    }, [models, search, deletedModels]);

    const togglePinModel = (id: string) => {
        const updated = pinnedModels.includes(id) ? pinnedModels.filter(m => m !== id) : [...pinnedModels, id];
        setPinnedModelsState(updated);
    };

    const toggleDeleteModel = (id: string) => {
        const updated = deletedModels.includes(id) ? deletedModels.filter(m => m !== id) : [...deletedModels, id];
        setDeletedModelsState(updated);
    };

    if (!showModelList) return null;

    return (
        <aside className="flex flex-col h-full w-80 border-r bg-white/95 shadow-sm sticky top-0 z-20" style={{ maxHeight: '100%' }}>
            <div className="px-4 pt-4 pb-3 border-b bg-white/80 sticky top-0 z-10">
                <h2 className="text-lg font-semibold text-[#2d3a4a] mb-3 tracking-tight">Models</h2>

                <ModelSearchBar
                    search={search}
                    setSearch={setSearch}
                    isMobile={false}
                />
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {loading ? (
                    <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                ) : filteredModels.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                        <p>{t('modelPicker.noModelsShort', 'No models found')}</p>
                        <p className="text-sm">{t('modelPicker.noModelsShortHint', 'Try adjusting your search or filters')}</p>
                    </div>
                ) : (
                    filteredModels.map((model) => (
                        <ModelListItem
                            key={model.id}
                            model={model}
                            isSelected={selectedModel?.id === model.id}
                            isPinned={pinnedModels.includes(model.id)}
                            isDeleted={deletedModels.includes(model.id)}
                            onSelect={setSelectedModel}
                            onPin={togglePinModel}
                            onDelete={toggleDeleteModel}
                            onShowDetails={onShowModelDetails || (() => { })}
                            hasWebSearchCapability={hasWebSearchCapability}
                            showNaira={showNaira}
                        />
                    ))
                )}
            </div>
        </aside>
    );
});

ModelListSidebarOptimized.displayName = 'ModelListSidebarOptimized';
