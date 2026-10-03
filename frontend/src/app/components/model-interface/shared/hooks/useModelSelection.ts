import { useState, useMemo, useCallback, useDeferredValue } from "react";
import { Model } from "@/app/components/model-interface/shared/types";
import {
  filterModelsNew,
  sortModelsNew,
  getModelAverageRequestCredits,
  ModelOrderBy,
  ModelOrderDir,
} from "@/app/components/model-interface/shared/utils";
import { mergeQuickPickIdsForDisplay } from "@/app/components/model-interface/shared/constants/quickPickModels";

export type ModelCatalogFilter = "all" | "default" | "ollama";

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
  groupByAffordability?: boolean;
}

/** When true, skip pinning quick-pick / default models ahead of the sorted list. */
export function isCatalogListRefinementActive(params: {
  search: string;
  selectedProviders: string[];
  imageFilterOnly: boolean;
  showWebSearch: boolean;
  orderBy: ModelOrderBy;
}): boolean {
  if (params.search.trim().length > 0) return true;
  if (params.selectedProviders.length > 0) return true;
  if (params.imageFilterOnly) return true;
  if (params.showWebSearch) return true;
  if (params.orderBy !== "default") return true;
  return false;
}

function partitionQuickPicksFirst(
  sorted: Model[],
  quickPickIds: string[],
  catalogFilter: ModelCatalogFilter,
): { quickPickModelsSorted: Model[]; otherModelsSorted: Model[] } {
  const quickPickSet = new Set(quickPickIds);
  const sortedById = new Map(sorted.map((m) => [m.id, m]));

  if (catalogFilter === "default") {
    const quickPickModelsSorted = quickPickIds
      .map((id) => sortedById.get(id))
      .filter((m): m is Model => m != null);
    return { quickPickModelsSorted, otherModelsSorted: [] };
  }

  if (catalogFilter === "ollama") {
    return { quickPickModelsSorted: [], otherModelsSorted: sorted };
  }

  const quickPickModelsSorted = quickPickIds
    .map((id) => sortedById.get(id))
    .filter((m): m is Model => m != null);
  const otherModelsSorted = sorted.filter((m) => !quickPickSet.has(m.id));
  return { quickPickModelsSorted, otherModelsSorted };
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
  groupByAffordability = false,
}: UseModelSelectionProps) {
  const [catalogFilter, setCatalogFilter] = useState<ModelCatalogFilter>("all");

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

  const effectiveQuickPickIds = useMemo(
    () => mergeQuickPickIdsForDisplay(models, pinnedModelIds),
    [models, pinnedModelIds],
  );

  const defaultModelsCount = useMemo(() => {
    const idSet = new Set(effectiveQuickPickIds);
    return models.filter((m) => idSet.has(m.id)).length;
  }, [models, effectiveQuickPickIds]);

  const ollamaModelsCount = useMemo(
    () => models.filter((m) => m.id.startsWith("ollama:")).length,
    [models],
  );

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

  const handleSetCatalogFilter = useCallback((v: ModelCatalogFilter) => {
    setCatalogFilter(v);
  }, []);

  // Memoized mapping of model cost
  const avgCostById = useMemo(() => {
    const m = new Map<string, number>();
    for (const md of models)
      m.set(md.id, Number(getModelAverageRequestCredits(md) || 0));
    return m;
  }, [models]);

  const { quickPickModelsSorted, otherModelsSorted } = useMemo(() => {
    let base = models;
    if (catalogFilter === "default") {
      const idSet = new Set(effectiveQuickPickIds);
      base = models.filter((m) => idSet.has(m.id));
    } else if (catalogFilter === "ollama") {
      base = models.filter((m) => m.id.startsWith("ollama:"));
    }

    const filtered = filterModelsNew(
      base,
      deferredSearch,
      selectedProviders,
      imageFilterOnly,
      showWebSearch,
    );
    const sorted = sortModelsNew(filtered, orderBy, orderDir);
    const refinementActive =
      isCatalogListRefinementActive({
        search: deferredSearch,
        selectedProviders,
        imageFilterOnly,
        showWebSearch,
        orderBy,
      }) ||
      catalogFilter !== "all" ||
      groupByAffordability;
    if (refinementActive) {
      return { quickPickModelsSorted: [], otherModelsSorted: sorted };
    }
    return partitionQuickPicksFirst(sorted, effectiveQuickPickIds, catalogFilter);
  }, [
    groupByAffordability,
    models,
    effectiveQuickPickIds,
    catalogFilter,
    deferredSearch,
    selectedProviders,
    imageFilterOnly,
    showWebSearch,
    orderBy,
    orderDir,
  ]);

  return {
    catalogFilter,
    setCatalogFilter: handleSetCatalogFilter,
    defaultModelsCount,
    ollamaModelsCount,
    effectiveQuickPickIds,
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
    quickPickModelsSorted,
    otherModelsSorted,
  };
}
