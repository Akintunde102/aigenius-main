import { useState, useEffect, useMemo } from 'react';
import { Model } from '@/app/components/model-interface/shared/types';
import { extractModalities, filterModels, sortModelsByCost } from '@/app/components/model-interface/shared/utils';

export function useModelState() {
    const [models, setModels] = useState<Model[]>([]);
    const [selectedModel, setSelectedModel] = useState<Model | null>(null);
    const [search, setSearch] = useState("");
    const [modelsLoading, setModelsLoading] = useState(false);
    const [orderByCost, setOrderByCost] = useState<'none' | 'asc' | 'desc'>('none');
    const [selectedModalities, setSelectedModalities] = useState<string[]>([]);
    const [selectedOutputModalities, setSelectedOutputModalities] = useState<string[]>([]);
    const [showWebSearch, setShowWebSearch] = useState(false);
    const [recentModelIds, setRecentModelIds] = useState<string[]>([]);

    // Extract modalities from models
    const { inputModalities, outputModalities } = useMemo(() =>
        extractModalities(models), [models]
    );

    // Load recent models from localStorage
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const stored = localStorage.getItem('nobox-recent-model-ids');
            if (stored) setRecentModelIds(JSON.parse(stored));
        }
    }, []);

    // Update recent models when model is selected
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

    // Get recent models
    const recentModels = useMemo(() =>
        recentModelIds.map(id => models.find(m => m.id === id)).filter((m): m is Model => Boolean(m)),
        [recentModelIds, models]
    );

    // Filter and sort models
    const filteredModels = useMemo(() =>
        models.filter(m =>
            m.name?.toLowerCase().includes(search.toLowerCase()) ||
            m.id?.toLowerCase().includes(search.toLowerCase())
        ),
        [models, search]
    );

    const modalFilteredModels = useMemo(() =>
        filterModels(models, search, selectedModalities, selectedOutputModalities, showWebSearch),
        [models, search, selectedModalities, selectedOutputModalities, showWebSearch]
    );

    const modalSortedModels = useMemo(() =>
        sortModelsByCost(modalFilteredModels, orderByCost),
        [modalFilteredModels, orderByCost]
    );

    // Check if model supports image upload
    const supportsImageUpload = useMemo(() =>
        selectedModel?.architecture?.input_modalities?.some((mod: string) =>
            mod.toLowerCase().includes('image') || mod.toLowerCase().includes('file')
        ),
        [selectedModel]
    );

    // Toggle modality filters
    const toggleModality = (mod: string) => {
        setSelectedModalities(prev =>
            prev.includes(mod) ? prev.filter(m => m !== mod) : [...prev, mod]
        );
    };

    const toggleOutputModality = (mod: string) => {
        setSelectedOutputModalities(prev =>
            prev.includes(mod) ? prev.filter(m => m !== mod) : [...prev, mod]
        );
    };

    return {
        // State
        models,
        setModels,
        selectedModel,
        setSelectedModel,
        search,
        setSearch,
        modelsLoading,
        setModelsLoading,
        orderByCost,
        setOrderByCost,
        selectedModalities,
        setSelectedModalities,
        selectedOutputModalities,
        setSelectedOutputModalities,
        showWebSearch,
        setShowWebSearch,

        // Computed
        inputModalities,
        outputModalities,
        recentModels,
        filteredModels,
        modalFilteredModels,
        modalSortedModels,
        supportsImageUpload,

        // Methods
        toggleModality,
        toggleOutputModality,
    };
} 