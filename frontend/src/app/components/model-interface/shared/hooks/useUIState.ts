import { useState, useEffect, useCallback, useRef } from "react";
import { Model } from "@/app/components/model-interface/shared/types";
import { extractModalities } from "@/app/components/model-interface/shared/utils";
import {
  fetchFavorites,
  setFavorites,
} from "@/app/components/model-interface/api/favoritesApi";
import {
  resolveDefaultQuickPickModelIds,
  mergeDefaultsWithSavedQuickPicks,
  mergeQuickPickIdsForDisplay,
  shouldMigrateLegacyFavoritesToQuickPicks,
  clearQuickPicksUserEmptied,
  markQuickPicksUserEmptied,
  readQuickPicksUserEmptied,
  markQuickPicksDefaultsMerged,
} from "@/app/components/model-interface/shared/constants/quickPickModels";

export { SHOW_LEGACY_FILTERS } from "../constants";
import type {
  ModelOrderBy,
  ModelOrderDir,
} from "@/app/components/model-interface/shared/utils";

export function useUIState(models: Model[]) {
  // Search and filters
  const [search, setSearch] = useState("");
  const [historySearch, setHistorySearch] = useState("");

  // Modal states
  const [showSaved, setShowSaved] = useState(false);
  const [showModelDetailsModal, setShowModelDetailsModal] = useState(false);
  const [selectedModelForDetails, setSelectedModelForDetails] =
    useState<Model | null>(null);
  const [showModelSelectionModal, setShowModelSelectionModal] = useState(false);

  // UI display states
  const [showCosts, setShowCosts] = useState(false);
  const [showNaira, setShowNaira] = useState(false);
  const [showTyping, setShowTyping] = useState(false);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [totalSpent, setTotalSpent] = useState(0);

  // Upload states
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [dragActive, setDragActive] = useState(false);

  // Per-session loading and streaming state maps.
  // Consumers derive the active-session value in useModelInterface using currentSessionId.
  const [loadingMap, setLoadingMap] = useState<Record<string, boolean>>({});
  const [streamingMap, setStreamingMap] = useState<Record<string, boolean>>({});
  const [streamingEnabled, setStreamingEnabled] = useState(true);

  const setLoadingForSession = useCallback((sessionId: string, value: boolean) => {
    setLoadingMap(prev => {
      if (prev[sessionId] === value) return prev;
      if (!value) {
        // Remove the key when clearing to keep the map lean
        const next = { ...prev };
        delete next[sessionId];
        return next;
      }
      return { ...prev, [sessionId]: value };
    });
  }, []);

  const setStreamingForSession = useCallback((sessionId: string, value: boolean) => {
    setStreamingMap(prev => {
      if (prev[sessionId] === value) return prev;
      if (!value) {
        const next = { ...prev };
        delete next[sessionId];
        return next;
      }
      return { ...prev, [sessionId]: value };
    });
  }, []);



  // Model filtering and sorting
  const [orderByCost, setOrderByCost] = useState<"none" | "asc" | "desc">(
    "none",
  );
  const [allModalities, setAllModalities] = useState<string[]>([]);
  const [selectedModalities, setSelectedModalities] = useState<string[]>([]);
  const [allOutputModalities, setAllOutputModalities] = useState<string[]>([]);
  const [selectedOutputModalities, setSelectedOutputModalities] = useState<
    string[]
  >([]);
  const [showWebSearch, setShowWebSearch] = useState(false);
  const [showToolsOnly, setShowToolsOnly] = useState(false);
  const [pinnedModelIds, setPinnedModelIds] = useState<string[]>([]);
  const [favoritesLoaded, setFavoritesLoaded] = useState(false);

  // Ref to track current pinnedModelIds for stable callbacks
  const pinnedModelIdsRef = useRef<string[]>([]);
  const modelsRef = useRef<Model[]>(models);
  const favoritesLoadedRef = useRef(favoritesLoaded);
  useEffect(() => {
    pinnedModelIdsRef.current = pinnedModelIds;
  }, [pinnedModelIds]);
  useEffect(() => {
    modelsRef.current = models;
  }, [models]);
  useEffect(() => {
    favoritesLoadedRef.current = favoritesLoaded;
  }, [favoritesLoaded]);

  const getEffectiveQuickPickIds = useCallback((): string[] => {
    return mergeQuickPickIdsForDisplay(
      modelsRef.current,
      pinnedModelIdsRef.current,
    );
  }, []);

  // New filter/sort state (used when !SHOW_LEGACY_FILTERS)
  const [orderBy, setOrderBy] = useState<ModelOrderBy>("default");
  const [orderDir, setOrderDir] = useState<ModelOrderDir>("asc");
  const [selectedProviders, setSelectedProviders] = useState<string[]>([]);
  const [imageFilterOnly, setImageFilterOnly] = useState(false);

  const handleSetOrderBy = useCallback((v: ModelOrderBy) => {
    setOrderBy(v);
    if (v === "release_date") {
      setOrderDir("desc");
    } else if (v === "cost") {
      setOrderDir("asc");
    }
  }, []);

  // Update modalities when models change
  useEffect(() => {
    const { inputModalities, outputModalities } = extractModalities(models);
    // Remove 'text' from modality filter options
    const filteredInputModalities = inputModalities.filter(
      (m) => m?.toLowerCase() !== "text",
    );
    const filteredOutputModalities = outputModalities.filter(
      (m) => m?.toLowerCase() !== "text",
    );
    setAllModalities(filteredInputModalities);
    setAllOutputModalities(filteredOutputModalities);
  }, [models]);

  // Fetch favorites from backend on mount (waits for models to be available
  // so we can seed featured models on first-ever login)
  useEffect(() => {
    // Guard: only run once models are loaded and we haven't already fetched
    if (favoritesLoaded || models.length === 0) return;

    const loadFavorites = async () => {
      try {
        const { favorites, hasSeededFavorites } = await fetchFavorites();

        // First-time user: seed quick-pick list with curated defaults (then featured fallbacks)
        if (!hasSeededFavorites) {
          const defaultQuickPickIds = resolveDefaultQuickPickModelIds(models);

          if (defaultQuickPickIds.length > 0) {
            await setFavorites(defaultQuickPickIds);
            setPinnedModelIds(defaultQuickPickIds);
            markQuickPicksDefaultsMerged();
          } else {
            await setFavorites([]);
            setPinnedModelIds([]);
          }
        } else {
          const userEmptied = readQuickPicksUserEmptied();

          if (favorites.length === 0 && !userEmptied) {
            const defaultQuickPickIds = resolveDefaultQuickPickModelIds(models);
            if (defaultQuickPickIds.length > 0) {
              await setFavorites(defaultQuickPickIds);
              setPinnedModelIds(defaultQuickPickIds);
              markQuickPicksDefaultsMerged();
            } else {
              setPinnedModelIds([]);
            }
          } else if (
            favorites.length > 0 &&
            !userEmptied &&
            shouldMigrateLegacyFavoritesToQuickPicks(models, favorites)
          ) {
            const merged = mergeDefaultsWithSavedQuickPicks(models, favorites);
            await setFavorites(merged);
            setPinnedModelIds(merged);
            markQuickPicksDefaultsMerged();
          } else {
            setPinnedModelIds(favorites);
            if (favorites.length > 0) {
              clearQuickPicksUserEmptied();
              markQuickPicksDefaultsMerged();
            }
          }
        }
      } catch (error) {
        console.error("Failed to load favorites:", error);
        // On error, still mark loaded so we don't loop forever
      } finally {
        setFavoritesLoaded(true);
      }
    };

    loadFavorites();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [models.length, favoritesLoaded]);

  // Modal keyboard handling
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!showModelSelectionModal) return;

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowModelSelectionModal(false);
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [showModelSelectionModal]);

  const toggleModality = useCallback((mod: string) => {
    if (selectedModalities.includes(mod)) {
      setSelectedModalities((prev) => prev.filter((m) => m !== mod));
    } else {
      setSelectedModalities((prev) => [...prev, mod]);
    }
  }, [selectedModalities]);

  const toggleOutputModality = useCallback((mod: string) => {
    if (selectedOutputModalities.includes(mod)) {
      setSelectedOutputModalities((prev) => prev.filter((m) => m !== mod));
    } else {
      setSelectedOutputModalities((prev) => [...prev, mod]);
    }
  }, [selectedOutputModalities]);

  const isModelPinned = useCallback(
    (id: string) =>
      mergeQuickPickIdsForDisplay(models, pinnedModelIds).includes(id),
    [pinnedModelIds, models],
  );

  const togglePinModel = useCallback(
    async (id: string) => {
      const effectivePinned = getEffectiveQuickPickIds();
      const isCurrentlyPinned = effectivePinned.includes(id);

      const nextPinned = isCurrentlyPinned
        ? effectivePinned.filter((mid) => mid !== id)
        : [...effectivePinned, id];

      setPinnedModelIds(nextPinned);

      if (nextPinned.length === 0) {
        markQuickPicksUserEmptied();
      } else {
        clearQuickPicksUserEmptied();
      }

      try {
        await setFavorites(nextPinned);
        markQuickPicksDefaultsMerged();
      } catch (error) {
        setPinnedModelIds(pinnedModelIdsRef.current);
        if (pinnedModelIdsRef.current.length === 0) {
          markQuickPicksUserEmptied();
        } else {
          clearQuickPicksUserEmptied();
        }
        console.error("Failed to sync favorite to backend:", error);
      }
    },
    [getEffectiveQuickPickIds],
  );

  return {
    // Search and filters
    search,
    setSearch,
    historySearch,
    setHistorySearch,

    // Modal states
    showSaved,
    setShowSaved,
    showModelDetailsModal,
    setShowModelDetailsModal,
    selectedModelForDetails,
    setSelectedModelForDetails,
    showModelSelectionModal,
    setShowModelSelectionModal,

    // UI display states
    showCosts,
    setShowCosts,
    showNaira,
    setShowNaira,
    showTyping,
    setShowTyping,
    showScrollToBottom,
    setShowScrollToBottom,
    totalSpent,
    setTotalSpent,

    // Upload states
    imagePreview,
    setImagePreview,
    uploading,
    setUploading,
    uploadProgress,
    setUploadProgress,
    dragActive,
    setDragActive,

    // Per-session loading and streaming maps
    loadingMap,
    streamingMap,
    setLoadingForSession,
    setStreamingForSession,
    streamingEnabled,
    setStreamingEnabled,



    // Model filtering and sorting
    orderByCost,
    setOrderByCost,
    allModalities,
    selectedModalities,
    allOutputModalities,
    selectedOutputModalities,
    showWebSearch,
    setShowWebSearch,
    showToolsOnly,
    setShowToolsOnly,
    pinnedModelIds,
    favoritesLoaded,

    // New filter/sort
    orderBy,
    setOrderBy: handleSetOrderBy,
    orderDir,
    setOrderDir,
    selectedProviders,
    setSelectedProviders,
    imageFilterOnly,
    setImageFilterOnly,

    // Methods
    toggleModality,
    toggleOutputModality,
    isModelPinned,
    togglePinModel,
  };
}
