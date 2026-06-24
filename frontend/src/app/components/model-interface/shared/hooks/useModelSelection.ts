import { useState, useMemo, useCallback, useDeferredValue } from "react";
import { Model } from "@/app/components/model-interface/shared/types";
import {
  filterModelsNew,
  sortModelsNew,
  getModelAverageRequestPrice,
  ModelOrderBy,
  ModelOrderDir,
} from "@/app/components/model-interface/shared/utils";

interface UseModelSelectionProps {
  models: Model[];
  pinnedModelIds: string[];
  // Controlled props from parent (optional for standalone use)
  search?: string;
  setSearch?: (v: string) => void;
  orderBy?: ModelOrderBy;
  setOrderBy?: (v: ModelOrderBy) => void;
  orderDir?: ModelOrderDir;
  setOrderDir?: (v: ModelOrderDir) => void;
  selectedProviders?: string[];
  setSelectedProviders?: (v: string[] | ((prev: string[]) => string[])) => void;
  imageFilterOnly?: boolean;
  setImageFilterOnly?: (v: boolean | ((prev: boolean) => boolean)) => void;
  showWebSearch?: boolean;
  setShowWebSearch?: (v: boolean) => void;
  // Initial fallback if uncontrolled
  initialOrderBy?: ModelOrderBy;
  initialOrderDir?: ModelOrderDir;
}

export function useModelSelection({
  models,
  pinnedModelIds,
  search: searchProp,
  setSearch: setSearchProp,
  orderBy: orderByProp,
  setOrderBy: setOrderByProp,
  orderDir: orderDirProp,
  setOrderDir: setOrderDirProp,
  selectedProviders: selectedProvidersProp,
  setSelectedProviders: setSelectedProvidersProp,
  imageFilterOnly: imageFilterOnlyProp,
  setImageFilterOnly: setImageFilterOnlyProp,
  showWebSearch: showWebSearchProp,
  setShowWebSearch: setShowWebSearchProp,
  initialOrderBy = "default",
  initialOrderDir = "asc",
}: UseModelSelectionProps) {
  const [activeTab, setActiveTab] = useState<"favorites" | "all" | "ollama">("favorites");

  // Internal state for uncontrolled mode
  const [internalSearch, setInternalSearch] = useState("");
  const [internalOrderBy, setInternalOrderBy] = useState<ModelOrderBy>(initialOrderBy);
  const [internalOrderDir, setInternalOrderDir] = useState<ModelOrderDir>(initialOrderDir);
  const [internalSelectedProviders, setInternalSelectedProviders] = useState<string[]>([]);
  const [internalImageFilterOnly, setInternalImageFilterOnly] = useState(false);
  const [internalShowWebSearch, setInternalShowWebSearch] = useState(false);

  // Derived current values (prefer props)
  const search = searchProp !== undefined ? searchProp : internalSearch;
  const orderBy = orderByProp !== undefined ? orderByProp : internalOrderBy;
  const orderDir = orderDirProp !== undefined ? orderDirProp : internalOrderDir;
  const selectedProviders =
    selectedProvidersProp !== undefined ? selectedProvidersProp : internalSelectedProviders;
  const imageFilterOnly =
    imageFilterOnlyProp !== undefined ? imageFilterOnlyProp : internalImageFilterOnly;
  const showWebSearch =
    showWebSearchProp !== undefined ? showWebSearchProp : internalShowWebSearch;

  // Use deferred value for search to keep filtering non-blocking and snappy
  const deferredSearch = useDeferredValue(search);

  // Wrapped setters
  const handleSetSearch = useCallback((v: string) => {
    setInternalSearch(v);
    setSearchProp?.(v);
  }, [setSearchProp]);

  const handleSetOrderBy = useCallback((v: ModelOrderBy) => {
    setInternalOrderBy(v);
    setOrderByProp?.(v);
  }, [setOrderByProp]);

  const handleSetOrderDir = useCallback((v: ModelOrderDir) => {
    setInternalOrderDir(v);
    setOrderDirProp?.(v);
  }, [setOrderDirProp]);

  const handleSetSelectedProviders = useCallback((v: string[] | ((prev: string[]) => string[])) => {
    if (typeof v === "function") {
      setInternalSelectedProviders((prev) => {
        const next = v(prev);
        setSelectedProvidersProp?.(next);
        return next;
      });
    } else {
      setInternalSelectedProviders(v);
      setSelectedProvidersProp?.(v);
    }
  }, [setSelectedProvidersProp]);

  const handleSetImageFilterOnly = useCallback((v: boolean | ((prev: boolean) => boolean)) => {
    if (typeof v === "function") {
      setInternalImageFilterOnly((prev) => {
        const next = v(prev);
        setImageFilterOnlyProp?.(next);
        return next;
      });
    } else {
      setInternalImageFilterOnly(v);
      setImageFilterOnlyProp?.(v);
    }
  }, [setImageFilterOnlyProp]);

  const handleSetShowWebSearch = useCallback((v: boolean) => {
    setInternalShowWebSearch(v);
    setShowWebSearchProp?.(v);
  }, [setShowWebSearchProp]);

  // Memoized mapping of model cost
  const avgCostById = useMemo(() => {
    const m = new Map<string, number>();
    for (const md of models)
      m.set(md.id, Number(getModelAverageRequestPrice(md) || 0));
    return m;
  }, [models]);

  // Favorites: pinned models filtered and sorted
  const favoritesSorted = useMemo(() => {
    if (activeTab !== "favorites") return [];

    // Filter favorites by unified deferred search term
    const baseFavorites = models.filter((m) => pinnedModelIds.includes(m.id));

    // Apply global filters (Provider, Web Search, Image) to favorites as well
    const filteredFavorites = filterModelsNew(
      baseFavorites,
      deferredSearch,
      selectedProviders,
      imageFilterOnly,
      showWebSearch
    );

    return sortModelsNew(filteredFavorites, orderBy, orderDir);
  }, [models, pinnedModelIds, deferredSearch, selectedProviders, showWebSearch, imageFilterOnly, orderBy, orderDir, activeTab]);

  // Ollama Models: filtered and sorted locally
  const ollamaModelsSorted = useMemo(() => {
    if (activeTab !== "ollama") return [];

    const baseOllama = models.filter((m) => m.id.startsWith("ollama:"));

    const filtered = filterModelsNew(
      baseOllama,
      deferredSearch,
      selectedProviders,
      imageFilterOnly,
      showWebSearch
    );
    return sortModelsNew(filtered, orderBy, orderDir);
  }, [models, deferredSearch, selectedProviders, imageFilterOnly, showWebSearch, orderBy, orderDir, activeTab]);

  // All Models: filtered, sorted, then split into main vs others
  const { mainModelsSorted, otherModelsSorted } = useMemo(() => {
    if (activeTab !== "all") {
      return { mainModelsSorted: [] as Model[], otherModelsSorted: [] as Model[] };
    }

    const filtered = filterModelsNew(
      models,
      deferredSearch,
      selectedProviders,
      imageFilterOnly,
      showWebSearch,
    );
    const sorted = sortModelsNew(filtered, orderBy, orderDir);
    const mainModelsSorted = sorted.filter((m) => m.main === true);
    const otherModelsSorted = sorted.filter((m) => m.main !== true);
    return { mainModelsSorted, otherModelsSorted };
  }, [models, deferredSearch, selectedProviders, imageFilterOnly, showWebSearch, orderBy, orderDir, activeTab]);

  const handleTabChange = useCallback((tab: "favorites" | "all" | "ollama") => {
    setActiveTab(tab);
  }, []);

  return {
    activeTab,
    setActiveTab: handleTabChange,
    search,
    setSearch: handleSetSearch,
    orderBy,
    setOrderBy: handleSetOrderBy,
    orderDir,
    setOrderDir: handleSetOrderDir,
    selectedProviders,
    setSelectedProviders: handleSetSelectedProviders,
    imageFilterOnly,
    setImageFilterOnly: handleSetImageFilterOnly,
    showWebSearch,
    setShowWebSearch: handleSetShowWebSearch,
    avgCostById,
    favoritesSorted,
    ollamaModelsSorted,
    mainModelsSorted,
    otherModelsSorted,
  };
}
