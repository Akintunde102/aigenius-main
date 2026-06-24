"use client";
/**
 * ModelContext - Centralized model selection and filtering
 * 
 * Responsibilities:
 * - Model list management
 * - Model selection
 * - Search and filtering
 * - Favorites/pinned models
 * - Recent models tracking
 * 
 * @example
 * ```tsx
 * const { models, selectedModel, selectModel, searchModels } = useModelContext();
 * ```
 */

import React, { createContext, useContext, useState, useCallback, ReactNode, useMemo } from 'react';

// ============================================================================
// Types
// ============================================================================

import { Model } from '../shared/types';
export type { Model };

export interface ModelContextValue {
  /** All available models */
  models: Model[];
  
  /** Set models list */
  setModels: (models: Model[]) => void;
  
  /** Currently selected model */
  selectedModel: Model | null;
  
  /** Select a model */
  selectModel: (model: Model | null) => void;
  
  /** Search query */
  searchQuery: string;
  
  /** Set search query */
  setSearchQuery: (query: string) => void;
  
  /** Filtered models based on search and filters */
  filteredModels: Model[];
  
  /** Selected modalities filter */
  selectedModalities: string[];
  
  /** Toggle modality filter */
  toggleModality: (modality: string) => void;
  
  /** Selected output modalities filter */
  selectedOutputModalities: string[];
  
  /** Toggle output modality filter */
  toggleOutputModality: (modality: string) => void;
  
  /** Selected providers filter */
  selectedProviders: string[];
  
  /** Set providers filter */
  setSelectedProviders: (providers: string[]) => void;
  
  /** Show only models with web search */
  showWebSearch: boolean;
  
  /** Set web search filter */
  setShowWebSearch: (show: boolean) => void;
  
  /** Show only models with tools */
  showToolsOnly: boolean;
  
  /** Set tools filter */
  setShowToolsOnly: (show: boolean) => void;
  
  /** Show only models with image support */
  imageFilterOnly: boolean;
  
  /** Set image filter */
  setImageFilterOnly: (show: boolean) => void;
  
  /** Pinned model IDs */
  pinnedModelIds: string[];
  
  /** Check if model is pinned */
  isModelPinned: (modelId: string) => boolean;
  
  /** Toggle model pin status */
  togglePinModel: (modelId: string) => void;
  
  /** Recent model IDs */
  recentModels: string[];
  
  /** Add model to recent */
  addToRecent: (modelId: string) => void;
  
  /** Order by field */
  orderBy: string;
  
  /** Set order by */
  setOrderBy: (field: string) => void;
  
  /** Order direction */
  orderDir: 'asc' | 'desc';
  
  /** Set order direction */
  setOrderDir: (dir: 'asc' | 'desc') => void;
  
  /** Order by cost */
  orderByCost: boolean;
  
  /** Set order by cost */
  setOrderByCost: (order: boolean) => void;
  
  /** Models loading state */
  isLoading: boolean;
  
  /** Favorites loaded state */
  favoritesLoaded: boolean;
}

// ============================================================================
// Context
// ============================================================================

const ModelContext = createContext<ModelContextValue | undefined>(undefined);

// ============================================================================
// Provider
// ============================================================================

interface ModelProviderProps {
  children: ReactNode;
  /** Initial models list */
  initialModels?: Model[];
  /** Initial selected model */
  initialSelectedModel?: Model | null;
  /** Loading state */
  isLoading?: boolean;
}

export function ModelProvider({ 
  children, 
  initialModels = [],
  initialSelectedModel = null,
  isLoading = false,
}: ModelProviderProps) {
  // Model state
  const [models, setModels] = useState<Model[]>(initialModels);
  const [selectedModel, setSelectedModel] = useState<Model | null>(initialSelectedModel);
  
  // Search and filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedModalities, setSelectedModalities] = useState<string[]>([]);
  const [selectedOutputModalities, setSelectedOutputModalities] = useState<string[]>([]);
  const [selectedProviders, setSelectedProviders] = useState<string[]>([]);
  const [showWebSearch, setShowWebSearch] = useState(false);
  const [showToolsOnly, setShowToolsOnly] = useState(false);
  const [imageFilterOnly, setImageFilterOnly] = useState(false);
  
  // Sorting
  const [orderBy, setOrderBy] = useState('name');
  const [orderDir, setOrderDir] = useState<'asc' | 'desc'>('asc');
  const [orderByCost, setOrderByCost] = useState(false);
  
  // Favorites and recent
  const [pinnedModelIds, setPinnedModelIds] = useState<string[]>([]);
  const [recentModels, setRecentModels] = useState<string[]>([]);
  const [favoritesLoaded, setFavoritesLoaded] = useState(false);

  /**
   * Select a model and add to recent
   */
  const selectModel = useCallback((model: Model | null) => {
    setSelectedModel(model);
    if (model) {
      addToRecent(model.id);
    }
  }, []);

  /**
   * Add model to recent list
   */
  const addToRecent = useCallback((modelId: string) => {
    setRecentModels(prev => {
      const filtered = prev.filter(id => id !== modelId);
      return [modelId, ...filtered].slice(0, 10); // Keep last 10
    });
  }, []);

  /**
   * Toggle modality filter
   */
  const toggleModality = useCallback((modality: string) => {
    setSelectedModalities(prev =>
      prev.includes(modality)
        ? prev.filter(m => m !== modality)
        : [...prev, modality]
    );
  }, []);

  /**
   * Toggle output modality filter
   */
  const toggleOutputModality = useCallback((modality: string) => {
    setSelectedOutputModalities(prev =>
      prev.includes(modality)
        ? prev.filter(m => m !== modality)
        : [...prev, modality]
    );
  }, []);

  /**
   * Check if model is pinned
   */
  const isModelPinned = useCallback((modelId: string): boolean => {
    return pinnedModelIds.includes(modelId);
  }, [pinnedModelIds]);

  /**
   * Toggle model pin status
   */
  const togglePinModel = useCallback((modelId: string) => {
    setPinnedModelIds(prev =>
      prev.includes(modelId)
        ? prev.filter(id => id !== modelId)
        : [...prev, modelId]
    );
  }, []);

  /**
   * Filter models based on search and filters
   */
  const filteredModels = useMemo(() => {
    let filtered = [...models];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(model =>
        model.name.toLowerCase().includes(query) ||
        model.id.toLowerCase().includes(query) ||
        model.provider?.toLowerCase().includes(query)
      );
    }

    // Modality filter
    if (selectedModalities.length > 0) {
      filtered = filtered.filter(model =>
        selectedModalities.some(m => model.modalities?.includes(m))
      );
    }

    // Output modality filter
    if (selectedOutputModalities.length > 0) {
      filtered = filtered.filter(model =>
        selectedOutputModalities.some(m => model.outputModalities?.includes(m))
      );
    }

    // Provider filter
    if (selectedProviders.length > 0) {
      filtered = filtered.filter(model =>
        model.provider && selectedProviders.includes(model.provider)
      );
    }

    // Web search filter
    if (showWebSearch) {
      filtered = filtered.filter(model => model.supportsWebSearch);
    }

    // Tools filter
    if (showToolsOnly) {
      filtered = filtered.filter(model => model.supportsTools);
    }

    // Image filter
    if (imageFilterOnly) {
      filtered = filtered.filter(model => model.supportsImageUpload);
    }

    // Sorting
    filtered.sort((a, b) => {
      let comparison = 0;
      
      if (orderByCost && a.costPerToken !== undefined && b.costPerToken !== undefined) {
        comparison = a.costPerToken - b.costPerToken;
      } else if (orderBy === 'name') {
        comparison = a.name.localeCompare(b.name);
      }
      
      return orderDir === 'asc' ? comparison : -comparison;
    });

    // Pinned models first
    const pinned = filtered.filter(m => pinnedModelIds.includes(m.id));
    const unpinned = filtered.filter(m => !pinnedModelIds.includes(m.id));
    
    return [...pinned, ...unpinned];
  }, [
    models,
    searchQuery,
    selectedModalities,
    selectedOutputModalities,
    selectedProviders,
    showWebSearch,
    showToolsOnly,
    imageFilterOnly,
    orderBy,
    orderDir,
    orderByCost,
    pinnedModelIds,
  ]);

  const value: ModelContextValue = useMemo(() => ({
    models,
    setModels,
    selectedModel,
    selectModel,
    searchQuery,
    setSearchQuery,
    filteredModels,
    selectedModalities,
    toggleModality,
    selectedOutputModalities,
    toggleOutputModality,
    selectedProviders,
    setSelectedProviders,
    showWebSearch,
    setShowWebSearch,
    showToolsOnly,
    setShowToolsOnly,
    imageFilterOnly,
    setImageFilterOnly,
    pinnedModelIds,
    isModelPinned,
    togglePinModel,
    recentModels,
    addToRecent,
    orderBy,
    setOrderBy,
    orderDir,
    setOrderDir,
    orderByCost,
    setOrderByCost,
    isLoading,
    favoritesLoaded,
  }), [
    models,
    selectedModel,
    selectModel,
    searchQuery,
    filteredModels,
    selectedModalities,
    toggleModality,
    selectedOutputModalities,
    toggleOutputModality,
    selectedProviders,
    showWebSearch,
    showToolsOnly,
    imageFilterOnly,
    pinnedModelIds,
    isModelPinned,
    togglePinModel,
    recentModels,
    addToRecent,
    orderBy,
    orderDir,
    orderByCost,
    isLoading,
    favoritesLoaded,
  ]);

  return (
    <ModelContext.Provider value={value}>
      {children}
    </ModelContext.Provider>
  );
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Access model context
 * @throws Error if used outside ModelProvider
 */
export function useModelContext(): ModelContextValue {
  const context = useContext(ModelContext);
  
  if (context === undefined) {
    throw new Error('useModelContext must be used within a ModelProvider');
  }
  
  return context;
}
