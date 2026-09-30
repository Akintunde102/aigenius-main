import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FiX, FiSearch, FiZap, FiGrid, FiCpu, FiSliders, FiGlobe, FiCheckCircle, FiRotateCcw } from "react-icons/fi";
import { FaRegImage } from "react-icons/fa";
import { Model } from "@/app/components/model-interface/shared/types";
import {
  getMajorProviders,
  extractProviders,
  getProviderLabel,
  ModelOrderBy,
  ModelOrderDir,
} from "@/app/components/model-interface/shared/utils";
import { ModelSelectionFiltersNew } from "./ModelSelectionFiltersNew";
import { useModelSelection } from "@/app/components/model-interface/shared/hooks/useModelSelection";
import { RecentModelChips } from "./RecentModelChips";
import { ModelSelectionGrid } from "./ModelSelectionGrid";
import { FavoritesEmptyState } from "./FavoritesEmptyState";
import { isAigeniusDesktopRuntime } from "@/lib/utils/desktop-runtime";
import {
  isActiveModelOutsideQuickPicks,
  isModelInCatalog,
  mergeQuickPickIdsForDisplay,
} from "@/app/components/model-interface/shared/constants/quickPickModels";
import { partitionModelsByWalletAffordance } from "@/app/components/model-interface/features/models/utils/modelWalletAffordance.utils";
import type { ModelSelectionSection } from "./ModelSelectionGrid";
import { trackModelSelected } from "@/lib/analytics/product-events";

const MODEL_PICKER_GROUP_BY_AFFORDABILITY_KEY =
  "nobox-model-picker-group-by-affordability";

function readGroupByAffordabilityPreference(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  return localStorage.getItem(MODEL_PICKER_GROUP_BY_AFFORDABILITY_KEY) === "1";
}

function persistGroupByAffordabilityPreference(value: boolean): void {
  if (typeof window === "undefined") {
    return;
  }
  if (value) {
    localStorage.setItem(MODEL_PICKER_GROUP_BY_AFFORDABILITY_KEY, "1");
  } else {
    localStorage.removeItem(MODEL_PICKER_GROUP_BY_AFFORDABILITY_KEY);
  }
}

function ModelsLoadingSign() {
  return (
    <div
      className="flex flex-col items-center justify-center gap-3 py-16"
      role="status"
      aria-live="polite"
      aria-label="Loading models"
    >
      <div
        className="h-8 w-8 animate-spin rounded-full border-2"
        style={{
          borderColor: "var(--modal-border)",
          borderTopColor: "var(--chat-accent)",
        }}
        aria-hidden
      />
      <p className="text-sm" style={{ color: "var(--modal-muted-fg)" }}>
        Loading models…
      </p>
    </div>
  );
}

interface ModelSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  models: Model[];
  search: string;
  setSearch: (search: string) => void;
  selectedModel: Model | null;
  setSelectedModel: (model: Model | null) => void;
  selectedModelForDetails: Model | null;
  setSelectedModelForDetails: (model: Model | null) => void;
  handleShowModelDetails: (model: Model) => void;
  pinnedModelIds: string[];
  isModelPinned: (id: string) => boolean;
  togglePinModel: (id: string) => void | Promise<void>;
  favoritesLoaded?: boolean;
  modelsLoading?: boolean;
  recentModels?: Model[];
  // Sort/Filter props
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
  // Legacy filter/modality props passed from ModalContainer
  allModalities?: string[];
  selectedModalities?: string[];
  toggleModality?: (mod: string) => void;
  allOutputModalities?: string[];
  selectedOutputModalities?: string[];
  toggleOutputModality?: (mod: string) => void;
  showToolsOnly?: boolean;
  setShowToolsOnly?: (show: boolean) => void;
  orderByCost?: "none" | "asc" | "desc";
  setOrderByCost?: (order: "none" | "asc" | "desc") => void;
  wallet?: number | null;
  onAddCredits?: () => void;
}

export const ModelSelectionModal = React.memo(({
  isOpen,
  onClose,
  models,
  search: searchProp,
  setSearch: setSearchProp,
  selectedModel,
  setSelectedModel,
  selectedModelForDetails,
  setSelectedModelForDetails,
  handleShowModelDetails,
  pinnedModelIds,
  isModelPinned,
  togglePinModel,
  favoritesLoaded,
  modelsLoading = false,
  recentModels = [],
  orderBy: orderByProp = "default",
  setOrderBy: setOrderByProp,
  orderDir: orderDirProp = "asc",
  setOrderDir: setOrderDirProp,
  selectedProviders: selectedProvidersProp,
  setSelectedProviders: setSelectedProvidersProp,
  imageFilterOnly: imageFilterOnlyProp,
  setImageFilterOnly: setImageFilterOnlyProp,
  showWebSearch: showWebSearchProp,
  setShowWebSearch: setShowWebSearchProp,
  wallet = null,
  onAddCredits,
}: ModelSelectionModalProps) => {
  const [isMobile, setIsMobile] = useState(false);
  const [showFilterSortRow, setShowFilterSortRow] = useState(true);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [groupByAffordability, setGroupByAffordability] = useState(
    readGroupByAffordabilityPreference,
  );

  const setGroupByAffordabilityPersisted = useCallback(
    (value: boolean | ((prev: boolean) => boolean)) => {
      setGroupByAffordability((prev) => {
        const next = typeof value === "function" ? value(prev) : value;
        persistGroupByAffordabilityPreference(next);
        return next;
      });
    },
    [],
  );

  const hasAutoSwitchedRef = React.useRef(false);
  const parentRef = React.useRef<HTMLDivElement>(null);
  const searchRef = React.useRef<HTMLInputElement>(null);

  // Local state for debounced search
  const [localSearch, setLocalSearch] = useState(searchProp);
  const skipNextSyncRef = React.useRef(false);

  // Use the custom hook to manage tab state, filtering and sorting
  const {
    activeTab,
    setActiveTab,
    orderBy,
    setOrderBy,
    orderDir,
    setOrderDir,
    selectedProviders,
    setSelectedProviders,
    imageFilterOnly,
    setImageFilterOnly,
    showWebSearch,
    setShowWebSearch,
    avgCostById,
    favoritesSorted,
    ollamaModelsSorted,
    mainModelsSorted,
    otherModelsSorted,
  } = useModelSelection({
    models,
    pinnedModelIds,
    search: localSearch, // Fast local filtering
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
    initialOrderBy: orderByProp,
    initialOrderDir: orderDirProp,
  });

  // Sync prop changes back to local state (e.g. if cleared from outside)
  useEffect(() => {
    if (skipNextSyncRef.current) {
      skipNextSyncRef.current = false;
      return;
    }
    if (searchProp !== localSearch) {
      setLocalSearch(searchProp);
    }
  }, [searchProp]); // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced sync from local state to hook state
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearch !== searchProp) {
        skipNextSyncRef.current = true;
        setSearchProp(localSearch);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [localSearch, setSearchProp, searchProp]);

  // Press "/" to focus search input
  useEffect(() => {
    if (!isOpen) return;
    const handleSlash = (e: KeyboardEvent) => {
      if (
        e.key === "/" &&
        !["INPUT", "TEXTAREA"].includes((e.target as HTMLElement)?.tagName)
      ) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleSlash);
    return () => window.removeEventListener("keydown", handleSlash);
  }, [isOpen]);

  const effectiveQuickPickIds = useMemo(
    () => mergeQuickPickIdsForDisplay(models, pinnedModelIds),
    [models, pinnedModelIds],
  );

  const sharedCardProps = useMemo(() => ({
    isModelPinned,
    togglePinModel,
    onSelect: (model: Model) => {
      trackModelSelected({ model, source: 'model_picker' });
      setSelectedModel(model);
      onClose();
    },
    avgCostById,
    selectedModelId: selectedModel?.id,
    handleShowModelDetails,
    isMobile,
    isSortingByReleaseDate: orderBy === "release_date",
    wallet,
    onAddCredits,
  }), [isModelPinned, togglePinModel, setSelectedModel, onClose, avgCostById, selectedModel?.id, handleShowModelDetails, isMobile, orderBy, wallet, onAddCredits]);

  const majorProviders = useMemo(
    () => getMajorProviders(extractProviders(models)),
    [models],
  );

  // Detect mobile on mount and resize
  useEffect(() => {
    setMounted(true);
    if (typeof window === "undefined") return;
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const handleRequestRecentModel = useCallback(
    (model: Model) => {
      handleShowModelDetails(model);
    },
    [handleShowModelDetails],
  );

  // Reset any inline selection when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedModelForDetails(null);
    }
  }, [isOpen, setSelectedModelForDetails]);

  const handleClose = useCallback(() => {
    setSelectedModelForDetails(null);
    onClose();
  }, [onClose, setSelectedModelForDetails]);

  const filteredMainModels = mainModelsSorted;
  const filteredOtherModels = otherModelsSorted;

  const allModelsFlat = useMemo(() => {
    return [...filteredMainModels, ...filteredOtherModels];
  }, [filteredMainModels, filteredOtherModels]);

  const buildAffordabilitySections = useCallback(
    (modelsToSplit: Model[]): ModelSelectionSection[] => {
      const { affordable, locked } = partitionModelsByWalletAffordance(
        modelsToSplit,
        wallet,
        avgCostById,
        selectedModel?.id,
      );
      const sections: ModelSelectionSection[] = [];
      if (affordable.length > 0) {
        sections.push({ title: "Models you can use", models: affordable });
      }
      if (locked.length > 0) {
        sections.push({ title: "Need more credits", models: locked });
      }
      return sections;
    },
    [wallet, avgCostById, selectedModel?.id],
  );

  const allModelSections = useMemo(() => {
    if (groupByAffordability) {
      return buildAffordabilitySections(allModelsFlat);
    }

    const sections: ModelSelectionSection[] = [];
    if (filteredMainModels.length > 0) {
      sections.push({ title: "Main models", models: filteredMainModels });
    }
    if (filteredOtherModels.length > 0) {
      sections.push({
        title: filteredMainModels.length > 0 ? "Others" : "",
        models: filteredOtherModels,
      });
    }
    return sections;
  }, [
    groupByAffordability,
    buildAffordabilitySections,
    allModelsFlat,
    filteredMainModels,
    filteredOtherModels,
  ]);

  const favoritesGridSections = useMemo(() => {
    if (activeTab !== "favorites") return undefined;

    const sections: { title: string; models: Model[] }[] = [];
    const showActiveOutside =
      selectedModel != null &&
      isModelInCatalog(models, selectedModel.id) &&
      isActiveModelOutsideQuickPicks(selectedModel, effectiveQuickPickIds);

    if (showActiveOutside && selectedModel) {
      sections.push({ title: "Currently in use", models: [selectedModel] });
    }

    if (favoritesSorted.length > 0) {
      if (groupByAffordability) {
        sections.push(...buildAffordabilitySections(favoritesSorted));
      } else {
        sections.push({
          title: showActiveOutside ? "Quick picks" : "",
          models: favoritesSorted,
        });
      }
    }

    return sections.length > 0 ? sections : undefined;
  }, [
    activeTab,
    selectedModel,
    effectiveQuickPickIds,
    models,
    favoritesSorted,
    groupByAffordability,
    buildAffordabilitySections,
  ]);

  const ollamaModelSections = useMemo(() => {
    if (activeTab !== "ollama" || !groupByAffordability) {
      return undefined;
    }
    return buildAffordabilitySections(ollamaModelsSorted);
  }, [activeTab, groupByAffordability, ollamaModelsSorted, buildAffordabilitySections]);

  const showModelsLoading =
    (modelsLoading && models.length === 0) ||
    (activeTab === "favorites" && favoritesLoaded === false);

  // Set initial tab once when the modal opens
  useEffect(() => {
    if (!isOpen) {
      hasAutoSwitchedRef.current = false;
      return;
    }

    if (favoritesLoaded === false) {
      return;
    }

    if (hasAutoSwitchedRef.current) {
      return;
    }

    hasAutoSwitchedRef.current = true;

    if (effectiveQuickPickIds.length > 0) {
      setActiveTab("favorites");
    } else {
      setActiveTab("all");
    }
    setShowFilterSortRow(true);
  }, [isOpen, favoritesLoaded, effectiveQuickPickIds.length, setActiveTab]);

  // Fallback: auto-switch to "all" if favorites are empty while still on favorites tab
  useEffect(() => {
    if (!hasAutoSwitchedRef.current && favoritesLoaded && effectiveQuickPickIds.length === 0 && activeTab === "favorites") {
      hasAutoSwitchedRef.current = true;
      setActiveTab("all");
      setShowFilterSortRow(true);
    }
  }, [favoritesLoaded, effectiveQuickPickIds.length, activeTab, setActiveTab]);

  // Handle Esc and Cmd/Ctrl + K to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" || ((e.metaKey || e.ctrlKey) && e.key === "k")) {
        e.preventDefault();
        handleClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handleClose]);

  const currentViewTitle = useMemo(() => {
    if (activeTab === "favorites") return "Quick Models";
    if (selectedProviders.length > 0) return `${getProviderLabel(selectedProviders[0])} Models`;
    if (activeTab === "ollama") return "Ollama Models";
    return "All Models";
  }, [activeTab, selectedProviders]);

  const currentViewSubtitle = useMemo(() => {
    if (activeTab === "favorites") {
      return "Curated fast models for everyday tasks and quick iterations.";
    }
    if (selectedProviders.length > 0) {
      return `Models developed and hosted by ${getProviderLabel(selectedProviders[0])}.`;
    }
    if (activeTab === "ollama") {
      return "Locally installed and running models on your machine via Ollama.";
    }
    return "Browse and select from all available AI models.";
  }, [activeTab, selectedProviders]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (localSearch.trim()) count++;
    if (orderBy !== "default") count++;
    if (imageFilterOnly) count++;
    if (selectedProviders.length > 0) count++;
    if (showWebSearch) count++;
    if (groupByAffordability) count++;
    return count;
  }, [localSearch, orderBy, imageFilterOnly, selectedProviders.length, showWebSearch, groupByAffordability]);

  const hasAnyFilterActive = activeFiltersCount > 0;

  const handleResetAllFilters = useCallback(() => {
    setLocalSearch("");
    setSearchProp("");
    setOrderBy("default");
    setOrderDir("asc");
    setImageFilterOnly(false);
    setSelectedProviders([]);
    setShowWebSearch(false);
    setGroupByAffordabilityPersisted(false);
  }, [setSearchProp, setOrderBy, setOrderDir, setImageFilterOnly, setSelectedProviders, setShowWebSearch, setGroupByAffordabilityPersisted]);

  const displayedModelCount = useMemo(() => {
    if (activeTab === "favorites") {
      if (favoritesGridSections) {
        return favoritesGridSections.reduce((sum, s) => sum + s.models.length, 0);
      }
      return favoritesSorted.length;
    }
    if (activeTab === "ollama") {
      if (ollamaModelSections) {
        return ollamaModelSections.reduce((sum, s) => sum + s.models.length, 0);
      }
      return ollamaModelsSorted.length;
    }
    if (allModelSections) {
      return allModelSections.reduce((sum, s) => sum + s.models.length, 0);
    }
    return allModelsFlat.length;
  }, [activeTab, favoritesGridSections, favoritesSorted.length, ollamaModelSections, ollamaModelsSorted.length, allModelSections, allModelsFlat.length]);

  if (!isOpen || !mounted) {
    if (!mounted) return null;
    return (
      <div
        aria-hidden="true"
        style={{ visibility: "hidden", pointerEvents: "none", position: "fixed", inset: 0, zIndex: -1 }}
      />
    );
  }

  const modalContent = (
    <div
      className={`fixed inset-0 z-[110] flex ${isMobile ? "items-stretch" : "items-center"} justify-center backdrop-blur-sm transition-all duration-200 ease-out p-0`}
      style={{
        background: "var(--modal-overlay)",
        ...(isMobile ? { top: 0, bottom: 0 } : {}),
      }}
    >
      <div
        className={`flex w-full scale-100 ${isMobile ? "flex-col" : "flex-row"} overflow-hidden rounded-2xl border opacity-100 shadow-2xl transition-all duration-200 ease-out ${isMobile ? "" : "h-[90vh] max-h-[900px] w-[94vw] max-w-6xl"}`}
        style={{
          background: "var(--modal-bg)",
          borderColor: "var(--modal-border)",
          color: "var(--modal-fg)",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.45), 0 0 0 1px var(--modal-border)",
          ...(isMobile ? { height: "100%", maxHeight: "none", borderRadius: 0 } : {}),
        }}
      >
        {/* Left Sidebar Column - Holds search, model collections, and full filters */}
        <aside
          className={`${
            isMobile
              ? "w-full border-b shrink-0 flex flex-col"
              : "w-64 lg:w-72 border-r shrink-0 flex flex-col h-full overflow-hidden"
          }`}
          style={{
            borderColor: "var(--modal-border)",
            background: "var(--sidebar-bg)",
          }}
        >
          {isMobile ? (
            /* Mobile compact header with search and collapsible filters */
            <div className="p-3 border-b flex flex-col gap-2 shrink-0" style={{ borderColor: "var(--modal-border)" }}>
              <div className="flex items-center gap-2">
                <div className="relative flex-1 min-w-0">
                  <FiSearch
                    size={13}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
                    style={{ color: "var(--sidebar-muted-fg)" }}
                  />
                  <input
                    ref={searchRef}
                    type="text"
                    placeholder="Search models..."
                    value={localSearch}
                    onChange={(e) => setLocalSearch(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Escape" && localSearch) {
                        e.stopPropagation();
                        setLocalSearch("");
                      }
                    }}
                    className="app-modal-input rounded-lg pl-7 pr-6 text-xs h-8 w-full"
                    style={{
                      background: "var(--sidebar-search-bg)",
                      borderColor: "var(--sidebar-border)",
                      color: "var(--sidebar-search-fg)",
                    }}
                  />
                  {localSearch && (
                    <button
                      type="button"
                      onClick={() => setLocalSearch("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded"
                      style={{ color: "var(--sidebar-muted-fg)" }}
                      title="Clear search"
                    >
                      <FiX size={12} />
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setShowMobileFilters((prev) => !prev)}
                  className={`app-filter-pill flex items-center gap-1.5 px-2.5 h-8 text-xs font-medium ${
                    showMobileFilters || activeFiltersCount > 0 ? "app-filter-pill--active" : ""
                  }`}
                >
                  <FiSliders size={13} />
                  <span>Filters</span>
                  {activeFiltersCount > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-[var(--chat-accent)] text-white">
                      {activeFiltersCount}
                    </span>
                  )}
                </button>
              </div>

              {/* Tab pills row */}
              <div className="flex items-center gap-1 overflow-x-auto pb-0.5 [scrollbar-width:none]">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("favorites");
                    if (selectedProviders.length > 0) setSelectedProviders([]);
                  }}
                  aria-label="Quick picks"
                  className={`app-tab-pill flex items-center gap-1.5 py-1 px-2.5 text-xs whitespace-nowrap ${
                    activeTab === "favorites" && selectedProviders.length === 0 ? "app-tab-pill--active" : ""
                  }`}
                >
                  <FiZap size={13} className="text-amber-500 shrink-0" />
                  <span>Quick Models ({effectiveQuickPickIds.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("all");
                    if (selectedProviders.length > 0) setSelectedProviders([]);
                  }}
                  aria-label="All Models"
                  className={`app-tab-pill flex items-center gap-1.5 py-1 px-2.5 text-xs whitespace-nowrap ${
                    activeTab === "all" && selectedProviders.length === 0 ? "app-tab-pill--active" : ""
                  }`}
                >
                  <FiGrid size={13} className="text-sky-400 shrink-0" />
                  <span>All Models ({models.length})</span>
                </button>

                {isAigeniusDesktopRuntime() && (
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab("ollama");
                      if (selectedProviders.length > 0) setSelectedProviders([]);
                    }}
                    aria-label="Ollama"
                    className={`app-tab-pill flex items-center gap-1.5 py-1 px-2.5 text-xs whitespace-nowrap ${
                      activeTab === "ollama" ? "app-tab-pill--active" : ""
                    }`}
                  >
                    <FiCpu size={13} className="text-purple-400 shrink-0" />
                    <span>Ollama</span>
                  </button>
                )}
              </div>

              {/* Collapsible Mobile Filters Drawer */}
              {showMobileFilters && (
                <div className="pt-2 border-t mt-1" style={{ borderColor: "var(--modal-border)" }}>
                  <ModelSelectionFiltersNew
                    isMobile
                    showFilterSortRow={showFilterSortRow}
                    setShowFilterSortRow={setShowFilterSortRow}
                    orderBy={orderBy}
                    setOrderBy={setOrderBy}
                    orderDir={orderDir}
                    setOrderDir={setOrderDir}
                    imageFilterOnly={imageFilterOnly}
                    setImageFilterOnly={setImageFilterOnly}
                    selectedProviders={selectedProviders}
                    setSelectedProviders={setSelectedProviders}
                    showWebSearch={showWebSearch}
                    setShowWebSearch={setShowWebSearch}
                    majorProviders={majorProviders}
                    groupByAffordability={groupByAffordability}
                    setGroupByAffordability={setGroupByAffordabilityPersisted}
                    onResetAll={handleResetAllFilters}
                    activeFiltersCount={activeFiltersCount}
                  />
                </div>
              )}
            </div>
          ) : (
            /* Desktop rich sidebar */
            <>
              {/* Sidebar Search Bar */}
              <div
                className="p-3 border-b flex-shrink-0"
                style={{
                  borderColor: "var(--modal-border)",
                  background: "var(--sidebar-bg)",
                }}
              >
                <div className="relative flex items-center">
                  <FiSearch
                    size={14}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
                    style={{ color: "var(--sidebar-muted-fg)" }}
                  />
                  <input
                    ref={searchRef}
                    type="text"
                    placeholder="Search models..."
                    value={localSearch}
                    onChange={(e) => setLocalSearch(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Escape" && localSearch) {
                        e.stopPropagation();
                        setLocalSearch("");
                      }
                    }}
                    className="app-modal-input rounded-lg pl-8 pr-7 text-xs h-8 w-full transition-colors"
                    style={{
                      background: "var(--sidebar-search-bg)",
                      borderColor: "var(--sidebar-border)",
                      color: "var(--sidebar-search-fg)",
                    }}
                  />
                  {localSearch ? (
                    <button
                      type="button"
                      onClick={() => setLocalSearch("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-black/5 dark:hover:bg-white/10"
                      style={{ color: "var(--sidebar-muted-fg)" }}
                      title="Clear search"
                    >
                      <FiX size={12} />
                    </button>
                  ) : (
                    <kbd
                      className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none px-1.5 py-0.5 text-[9px] font-mono rounded opacity-50 select-none"
                      style={{
                        background: "var(--modal-bg)",
                        border: "1px solid var(--sidebar-border)",
                        color: "var(--sidebar-muted-fg)",
                      }}
                      title="Press / to search"
                    >
                      /
                    </kbd>
                  )}
                </div>
              </div>

              {/* Sidebar Navigation & Filters */}
              <div className="flex-1 overflow-y-auto p-3 space-y-4 [scrollbar-width:thin]">
                {/* Models Navigation Section */}
                <div className="space-y-1">
                  <div className="px-1 pb-1">
                    <span className="text-[10px] font-semibold text-[var(--sidebar-muted-fg)] uppercase tracking-wider">
                      Models
                    </span>
                  </div>

                  <div className="flex flex-col gap-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab("favorites");
                        if (selectedProviders.length > 0) {
                          setSelectedProviders([]);
                        }
                      }}
                      aria-label="Quick picks"
                      className={`app-tab-pill flex items-center justify-between py-1.5 px-2.5 text-xs w-full text-left transition-colors ${
                        activeTab === "favorites" && selectedProviders.length === 0
                          ? "app-tab-pill--active"
                          : ""
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <FiZap size={14} className="shrink-0 text-amber-500" />
                        <span className="truncate">Quick Models</span>
                      </div>
                      <span
                        className="text-[10px] px-1.5 py-0.2 rounded-full font-medium"
                        style={{
                          background: "color-mix(in srgb, var(--modal-fg) 6%, transparent)",
                          color: "var(--sidebar-muted-fg)",
                        }}
                      >
                        {effectiveQuickPickIds.length}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab("all");
                        if (selectedProviders.length > 0) {
                          setSelectedProviders([]);
                        }
                      }}
                      aria-label="All Models"
                      className={`app-tab-pill flex items-center justify-between py-1.5 px-2.5 text-xs w-full text-left transition-colors ${
                        activeTab === "all" && selectedProviders.length === 0
                          ? "app-tab-pill--active"
                          : ""
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <FiGrid size={14} className="shrink-0 text-sky-400" />
                        <span className="truncate">All Models</span>
                      </div>
                      <span
                        className="text-[10px] px-1.5 py-0.2 rounded-full font-medium"
                        style={{
                          background: "color-mix(in srgb, var(--modal-fg) 6%, transparent)",
                          color: "var(--sidebar-muted-fg)",
                        }}
                      >
                        {models.length}
                      </span>
                    </button>

                    {isAigeniusDesktopRuntime() && (
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab("ollama");
                          if (selectedProviders.length > 0) {
                            setSelectedProviders([]);
                          }
                        }}
                        aria-label="Ollama"
                        className={`app-tab-pill flex items-center justify-between py-1.5 px-2.5 text-xs w-full text-left transition-colors ${
                          activeTab === "ollama" ? "app-tab-pill--active" : ""
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <FiCpu size={14} className="shrink-0 text-purple-400" />
                          <span className="truncate">Ollama</span>
                        </div>
                        <span
                          className="text-[10px] px-1.5 py-0.2 rounded-full font-medium"
                          style={{
                            background: "color-mix(in srgb, var(--modal-fg) 6%, transparent)",
                            color: "var(--sidebar-muted-fg)",
                          }}
                        >
                          {models.filter((m) => m.id.startsWith("ollama:")).length}
                        </span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Subtle Divider */}
                <div
                  className="border-t mx-0.5"
                  style={{ borderColor: "var(--modal-border)" }}
                />

                {/* Filter & Sort Controls */}
                <ModelSelectionFiltersNew
                  showFilterSortRow={showFilterSortRow}
                  setShowFilterSortRow={setShowFilterSortRow}
                  orderBy={orderBy}
                  setOrderBy={setOrderBy}
                  orderDir={orderDir}
                  setOrderDir={setOrderDir}
                  imageFilterOnly={imageFilterOnly}
                  setImageFilterOnly={setImageFilterOnly}
                  selectedProviders={selectedProviders}
                  setSelectedProviders={setSelectedProviders}
                  showWebSearch={showWebSearch}
                  setShowWebSearch={setShowWebSearch}
                  majorProviders={majorProviders}
                  groupByAffordability={groupByAffordability}
                  setGroupByAffordability={setGroupByAffordabilityPersisted}
                  isMobile={false}
                  onResetAll={handleResetAllFilters}
                  activeFiltersCount={activeFiltersCount}
                />
              </div>

              {/* Sidebar Status Footer */}
              <div
                className="px-3 py-2 border-t flex-shrink-0 flex items-center justify-between text-[11px]"
                style={{
                  borderColor: "var(--modal-border)",
                  background: "var(--sidebar-bg)",
                  color: "var(--sidebar-muted-fg)",
                }}
              >
                <span className="tabular-nums">
                  Showing {displayedModelCount} of {models.length}
                </span>
                {wallet !== null && (
                  <span
                    className="font-medium px-1.5 py-0.5 rounded text-[10px]"
                    style={{
                      background: "color-mix(in srgb, var(--chat-accent) 12%, transparent)",
                      color: "var(--credits-fg, var(--chat-accent))",
                    }}
                    title="Current wallet credits"
                  >
                    {wallet} cr
                  </span>
                )}
              </div>
            </>
          )}
        </aside>

        {/* Right Main Content Area */}
        <main
          className="flex-1 flex flex-col min-w-0 overflow-hidden"
          style={{ background: "var(--modal-bg)" }}
        >
          {/* Header */}
          <div
            className={`flex-shrink-0 border-b ${isMobile ? "px-3 py-2.5" : "px-5 py-3.5"}`}
            style={{ borderColor: "var(--modal-border)" }}
          >
            <div className="flex justify-between items-start gap-3">
              <div className="min-w-0 flex-1">
                {recentModels.length > 0 && (
                  <RecentModelChips
                    recentModels={recentModels}
                    highlightedModelId={selectedModelForDetails?.id ?? selectedModel?.id}
                    onPick={handleRequestRecentModel}
                    isMobile={isMobile}
                  />
                )}
                <h2
                  className={`text-lg font-bold tracking-tight ${recentModels.length > 0 ? "mt-2" : "mt-0.5"}`}
                  style={{ color: "var(--modal-fg)" }}
                >
                  {currentViewTitle}
                </h2>
                <p
                  className="text-xs mt-0.5 truncate leading-normal"
                  style={{ color: "var(--modal-muted-fg)" }}
                >
                  {currentViewSubtitle}
                </p>
              </div>
              <button
                type="button"
                className="h-7 w-7 rounded-lg flex items-center justify-center transition-colors duration-200 hover:bg-black/5 dark:hover:bg-white/10 hover:text-[var(--modal-fg)] shrink-0"
                style={{ color: "var(--modal-muted-fg)" }}
                onClick={handleClose}
                title="Close model selection"
              >
                <FiX size={16} strokeWidth={2} />
              </button>
            </div>
          </div>

          {/* Active Filter Chips Strip (Shows only when search or filters are active) */}
          {hasAnyFilterActive && (
            <div
              className={`flex-shrink-0 border-b flex items-center gap-1.5 flex-wrap ${
                isMobile ? "px-3 py-1.5" : "px-5 py-2"
              }`}
              style={{
                borderColor: "var(--modal-border)",
                background: "var(--modal-bg-muted)",
              }}
            >
              <span className="text-[11px] font-medium text-[var(--modal-muted-fg)] mr-0.5">
                Active:
              </span>

              {localSearch && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-[var(--modal-bg)] border border-[var(--modal-border)] text-[var(--modal-fg)] shadow-xs">
                  <span className="text-[var(--modal-muted-fg)]">Search:</span>
                  <span className="font-semibold max-w-[120px] truncate">{localSearch}</span>
                  <button
                    type="button"
                    onClick={() => setLocalSearch("")}
                    className="hover:text-red-500 rounded p-0.5 transition-colors"
                    title="Clear search"
                  >
                    <FiX size={11} />
                  </button>
                </span>
              )}

              {selectedProviders.length > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-[var(--modal-bg)] border border-[var(--modal-border)] text-[var(--modal-fg)] shadow-xs">
                  <span className="text-[var(--modal-muted-fg)]">Lab:</span>
                  <span className="font-semibold">{getProviderLabel(selectedProviders[0])}</span>
                  <button
                    type="button"
                    onClick={() => setSelectedProviders([])}
                    className="hover:text-red-500 rounded p-0.5 transition-colors"
                    title="Clear lab filter"
                  >
                    <FiX size={11} />
                  </button>
                </span>
              )}

              {imageFilterOnly && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-pink-500/10 border border-pink-500/20 text-pink-700 dark:text-pink-300">
                  <FaRegImage size={11} />
                  <span>Files & images</span>
                  <button
                    type="button"
                    onClick={() => setImageFilterOnly(false)}
                    className="hover:text-red-500 rounded p-0.5 transition-colors"
                    title="Remove files & images filter"
                  >
                    <FiX size={11} />
                  </button>
                </span>
              )}

              {showWebSearch && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-500/10 border border-blue-500/20 text-blue-700 dark:text-blue-300">
                  <FiGlobe size={11} />
                  <span>Web search</span>
                  <button
                    type="button"
                    onClick={() => setShowWebSearch(false)}
                    className="hover:text-red-500 rounded p-0.5 transition-colors"
                    title="Remove web search filter"
                  >
                    <FiX size={11} />
                  </button>
                </span>
              )}

              {groupByAffordability && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300">
                  <FiCheckCircle size={11} />
                  <span>Affordable only</span>
                  <button
                    type="button"
                    onClick={() => setGroupByAffordabilityPersisted(false)}
                    className="hover:text-red-500 rounded p-0.5 transition-colors"
                    title="Remove affordable only filter"
                  >
                    <FiX size={11} />
                  </button>
                </span>
              )}

              {orderBy !== "default" && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-[var(--modal-bg)] border border-[var(--modal-border)] text-[var(--modal-fg)] shadow-xs">
                  <span className="text-[var(--modal-muted-fg)]">Sort:</span>
                  <span className="font-semibold">{orderBy} ({orderDir === "asc" ? "↑" : "↓"})</span>
                  <button
                    type="button"
                    onClick={() => setOrderBy("default")}
                    className="hover:text-red-500 rounded p-0.5 transition-colors"
                    title="Reset sort"
                  >
                    <FiX size={11} />
                  </button>
                </span>
              )}

              <button
                type="button"
                onClick={handleResetAllFilters}
                className="text-[11px] font-medium text-[var(--chat-accent)] hover:underline ml-auto transition-colors"
              >
                Clear all
              </button>
            </div>
          )}

          {/* Content - Model Grid takes full remaining vertical height */}
          <div className="flex-1 overflow-hidden flex flex-col min-h-0">
            <div
              className={`flex-1 min-h-0 overflow-y-auto ${isMobile ? "p-2.5 pb-3" : "px-5 py-3 pb-5"}`}
              style={{ background: "var(--modal-bg)" }}
              ref={parentRef}
            >
              {showModelsLoading ? (
                <ModelsLoadingSign />
              ) : (
                <ModelSelectionGrid
                  parentRef={parentRef}
                  hasLeadingControl={false}
                  listKey={`${activeTab}-${selectedProviders.join(",")}-${groupByAffordability ? "afford" : "all"}`}
                  models={
                    activeTab === "favorites"
                      ? favoritesGridSections
                        ? undefined
                        : favoritesSorted
                      : activeTab === "ollama"
                        ? ollamaModelSections
                          ? undefined
                          : ollamaModelsSorted
                        : undefined
                  }
                  sections={
                    activeTab === "all"
                      ? allModelSections
                        ? allModelSections
                        : undefined
                      : activeTab === "favorites"
                        ? favoritesGridSections
                        : activeTab === "ollama"
                          ? ollamaModelSections
                          : undefined
                  }
                  emptyState={
                    activeTab === "favorites" && !favoritesGridSections && !hasAnyFilterActive
                      ? (
                        <FavoritesEmptyState onBrowse={() => {
                          setActiveTab("all");
                          setSelectedProviders([]);
                        }} />
                      )
                      : hasAnyFilterActive && displayedModelCount === 0
                        ? (
                          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                            <div
                              className="w-12 h-12 rounded-full flex items-center justify-center mb-3"
                              style={{
                                background: "color-mix(in srgb, var(--sidebar-muted-fg) 12%, transparent)",
                                color: "var(--sidebar-muted-fg)",
                              }}
                            >
                              <FiSearch size={20} />
                            </div>
                            <h3
                              className="text-sm font-semibold mb-1"
                              style={{ color: "var(--modal-fg)" }}
                            >
                              No matching models found
                            </h3>
                            <p
                              className="text-xs max-w-sm mb-4"
                              style={{ color: "var(--modal-muted-fg)" }}
                            >
                              {localSearch
                                ? `We couldn't find any models matching "${localSearch}". Try checking for typos or resetting your filters.`
                                : "No models match the currently selected filters."}
                            </p>
                            <button
                              type="button"
                              onClick={handleResetAllFilters}
                              className="app-modal-primary-btn text-xs px-3.5 py-1.5 rounded-lg font-medium inline-flex items-center gap-1.5"
                            >
                              <FiRotateCcw size={12} />
                              <span>Reset search & filters</span>
                            </button>
                          </div>
                        )
                        : undefined
                  }
                  {...sharedCardProps}
                />
              )}
              <div className={`${isMobile ? "h-3" : "h-6"}`} />
            </div>
          </div>
        </main>
      </div>
    </div>
  );

  return createPortal(
    modalContent as any,
    document.getElementById("modal-root") || document.body,
  );
});

ModelSelectionModal.displayName = 'ModelSelectionModal';
