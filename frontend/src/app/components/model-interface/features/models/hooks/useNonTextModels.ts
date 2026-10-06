import { useState, useMemo, useCallback, useDeferredValue } from "react";
import type { Model } from "@/app/components/model-interface/shared/types";
import {
  getProvider,
  extractProviders,
  getModelAverageRequestCredits,
  type ModelOrderBy,
  type ModelOrderDir,
} from "@/app/components/model-interface/shared/utils";
import {
  getNonTextModalityCategory,
  type NonTextModalityFilter,
} from "../utils/nonTextModelFormatting.utils";

export interface UseNonTextModelsProps {
  models: Model[];
  initialModality?: NonTextModalityFilter;
}

export function useNonTextModels({
  models,
  initialModality = "all",
}: UseNonTextModelsProps) {
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [selectedModality, setSelectedModality] =
    useState<NonTextModalityFilter>(initialModality);
  const [selectedProviders, setSelectedProviders] = useState<string[]>([]);
  const [orderBy, setOrderBy] = useState<ModelOrderBy>("default");
  const [orderDir, setOrderDir] = useState<ModelOrderDir>("asc");

  // Modality counts
  const modalityCounts = useMemo(() => {
    const counts: Record<NonTextModalityFilter, number> = {
      all: models.length,
      image: 0,
      video: 0,
      speech: 0,
      transcription: 0,
    };

    for (const m of models) {
      const cat = getNonTextModalityCategory(m);
      if (cat === "image") counts.image++;
      else if (cat === "video") counts.video++;
      else if (cat === "speech" || cat === "audio") counts.speech++;
      else if (cat === "transcription") counts.transcription++;
    }

    return counts;
  }, [models]);

  // Available unique providers
  const availableProviders = useMemo(() => {
    return extractProviders(models);
  }, [models]);

  // Filtered and sorted models
  const filteredModels = useMemo(() => {
    const query = deferredSearch.trim().toLowerCase();

    const matches = models.filter((m) => {
      // Modality filter
      if (selectedModality !== "all") {
        const cat = getNonTextModalityCategory(m);
        if (selectedModality === "speech") {
          if (cat !== "speech" && cat !== "audio") return false;
        } else if (cat !== selectedModality) {
          return false;
        }
      }

      // Provider filter
      if (selectedProviders.length > 0) {
        const p = getProvider(m.id).toLowerCase();
        const matchesProvider = selectedProviders.some(
          (sp) => sp.toLowerCase() === p,
        );
        if (!matchesProvider) return false;
      }

      // Search filter
      if (query.length > 0) {
        const name = (m.name || "").toLowerCase();
        const id = (m.id || "").toLowerCase();
        const desc = (m.description || "").toLowerCase();
        const provider = getProvider(m.id).toLowerCase();
        const params = Array.isArray((m as any)?.supported_parameters)
          ? (m as any).supported_parameters.join(" ").toLowerCase()
          : "";

        return (
          name.includes(query) ||
          id.includes(query) ||
          desc.includes(query) ||
          provider.includes(query) ||
          params.includes(query)
        );
      }

      return true;
    });

    // Sorting
    return [...matches].sort((a, b) => {
      let comparison = 0;
      switch (orderBy) {
        case "name":
          comparison = (a.name || a.id).localeCompare(b.name || b.id);
          break;
        case "provider":
          comparison = getProvider(a.id).localeCompare(getProvider(b.id));
          break;
        case "release_date": {
          const dateA = a.created || 0;
          const dateB = b.created || 0;
          comparison = dateB - dateA;
          break;
        }
        case "cost": {
          const costA = getModelOutputCost(a);
          const costB = getModelOutputCost(b);
          comparison = costA - costB;
          break;
        }
        case "default":
        default: {
          // Featured first, then newest
          const featA = a.featured ? 1 : 0;
          const featB = b.featured ? 1 : 0;
          if (featA !== featB) {
            return featB - featA;
          }
          const dateA = a.created || 0;
          const dateB = b.created || 0;
          comparison = dateB - dateA;
          break;
        }
      }

      return orderDir === "desc" ? -comparison : comparison;
    });
  }, [models, deferredSearch, selectedModality, selectedProviders, orderBy, orderDir]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (selectedModality !== "all") count++;
    if (selectedProviders.length > 0) count += selectedProviders.length;
    if (search.trim().length > 0) count++;
    if (orderBy !== "default") count++;
    return count;
  }, [selectedModality, selectedProviders, search, orderBy]);

  const resetFilters = useCallback(() => {
    setSearch("");
    setSelectedModality("all");
    setSelectedProviders([]);
    setOrderBy("default");
    setOrderDir("asc");
  }, []);

  return {
    search,
    setSearch,
    selectedModality,
    setSelectedModality,
    selectedProviders,
    setSelectedProviders,
    orderBy,
    setOrderBy,
    orderDir,
    setOrderDir,
    filteredModels,
    modalityCounts,
    availableProviders,
    activeFiltersCount,
    resetFilters,
  };
}

function getModelOutputCost(model: Model): number {
  const credits = getModelAverageRequestCredits(model);
  if (Number.isFinite(credits) && credits > 0) return credits;
  return 0;
}
