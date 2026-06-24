import React, { useState, useMemo, useEffect } from "react";
import { ModelSearchBar } from './ModelSearchBar';
import { ModelFilters } from './ModelFilters';
import { ModelListItem } from './ModelListItem';
import { SHOW_LEGACY_FILTERS } from '@/app/components/model-interface/shared/constants';
import { hasImageSupport } from '@/app/components/model-interface/shared/utils';
import { getPinnedModels, setPinnedModels, getDeletedModels, setDeletedModels } from '@/lib/utils/modelInterfaceUtils';
import { Model } from '@/app/components/model-interface/shared/types';

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
    orderByCost?: 'none' | 'asc' | 'desc';
    setOrderByCost?: (order: 'none' | 'asc' | 'desc') => void;
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
    showModelDetails = false,
    setShowModelList,
    setShowModelDetails,
    orderByCost = 'none',
    setOrderByCost,
    onShowModelDetails,
    hasWebSearchCapability,
    showNaira = false
}) => {
    const [selectedModalities, setSelectedModalities] = useState<string[]>([]);
    const [selectedOutputModalities, setSelectedOutputModalities] = useState<string[]>([]);
    const [pinnedModels, setPinnedModelsState] = useState<string[]>([]);
    const [deletedModels, setDeletedModelsState] = useState<string[]>([]);
    const [showWebSearch, setShowWebSearch] = useState(false);
    const [imageFilterOnly, setImageFilterOnly] = useState(false);

    // Collect all unique input modalities from models
    const allModalities = useMemo(() => {
        const set = new Set<string>();
        models.forEach(m => m.architecture?.input_modalities?.forEach((mod: string) => {
            if ((mod || '').toLowerCase() !== 'text') set.add(mod);
        }));
        return Array.from(set);
    }, [models]);

    // Collect all unique output modalities from models
    const allOutputModalities = useMemo(() => {
        const set = new Set<string>();
        models.forEach(m => m.architecture?.output_modalities?.forEach((mod: string) => {
            if ((mod || '').toLowerCase() !== 'text') set.add(mod);
        }));
        return Array.from(set);
    }, [models]);

    // Load from localStorage on mount
    useEffect(() => {
        setPinnedModelsState(getPinnedModels());
        setDeletedModelsState(getDeletedModels());
    }, []);

    // Save to localStorage when changed
    useEffect(() => {
        setPinnedModels(pinnedModels);
    }, [pinnedModels]);

    useEffect(() => {
        setDeletedModels(deletedModels);
    }, [deletedModels]);

    // Filter models by search and selected modalities (excluding deleted models)
    const filteredModels = useMemo(() => {
        return models.filter(m => {
            // First, exclude deleted models from the main list
            if (deletedModels.includes(m.id)) return false;

            const matchesSearch =
                m.name?.toLowerCase().includes(search.toLowerCase()) ||
                m.id?.toLowerCase().includes(search.toLowerCase()) ||
                m.description?.toLowerCase().includes(search.toLowerCase()) ||
                (m.architecture?.input_modalities?.filter((mod: string) => (mod || '').toLowerCase() !== 'text').some((mod: string) => mod.toLowerCase().includes(search.toLowerCase()))) ||
                (m.architecture?.output_modalities?.filter((mod: string) => (mod || '').toLowerCase() !== 'text').some((mod: string) => mod.toLowerCase().includes(search.toLowerCase())));

            const matchesInputModality = selectedModalities.length === 0 ||
                (m.architecture?.input_modalities?.filter((mod: string) => (mod || '').toLowerCase() !== 'text').some((mod: string) => selectedModalities.includes(mod)));

            const matchesOutputModality = selectedOutputModalities.length === 0 ||
                (m.architecture?.output_modalities?.filter((mod: string) => (mod || '').toLowerCase() !== 'text').some((mod: string) => selectedOutputModalities.includes(mod)));

            const matchesWebSearch = !showWebSearch || (hasWebSearchCapability && hasWebSearchCapability(m));
            const matchesImageOnly = !imageFilterOnly || hasImageSupport(m);

            return matchesSearch && matchesInputModality && matchesOutputModality && matchesWebSearch && matchesImageOnly;
        });
    }, [models, search, selectedModalities, selectedOutputModalities, showWebSearch, deletedModels, hasWebSearchCapability, imageFilterOnly]);

    // Tag click handlers
    const toggleModality = (mod: string) => {
        setSelectedModalities(prev => prev.includes(mod) ? prev.filter(m => m !== mod) : [...prev, mod]);
    };

    const toggleOutputModality = (mod: string) => {
        setSelectedOutputModalities(prev => prev.includes(mod) ? prev.filter(m => m !== mod) : [...prev, mod]);
    };

    // Pin/unpin model
    const togglePinModel = (id: string) => {
        const updated = pinnedModels.includes(id) ? pinnedModels.filter(m => m !== id) : [...pinnedModels, id];
        setPinnedModelsState(updated);
    };

    // Delete/restore model
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
                    isMobile={false} // Sidebar is not shown on mobile, so always false
                />

                {SHOW_LEGACY_FILTERS && (
                    <ModelFilters
                        allModalities={allModalities}
                        selectedModalities={selectedModalities}
                        toggleModality={toggleModality}
                        allOutputModalities={allOutputModalities}
                        selectedOutputModalities={selectedOutputModalities}
                        toggleOutputModality={toggleOutputModality}
                        showWebSearch={showWebSearch}
                        setShowWebSearch={setShowWebSearch}
                        orderByCost={orderByCost}
                        setOrderByCost={setOrderByCost || (() => { })}
                        isMobile={false}
                        imageFilterOnly={imageFilterOnly}
                        setImageFilterOnly={setImageFilterOnly}
                    />
                )}
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {loading ? (
                    <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                ) : filteredModels.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                        <p>No models found</p>
                        <p className="text-sm">Try adjusting your search or filters</p>
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