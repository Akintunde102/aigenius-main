import React, { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { FiX } from "react-icons/fi";
import { Model } from "@/app/components/model-interface/shared/types";
import {
  getMajorProviders,
  extractProviders,
  ModelOrderBy,
  ModelOrderDir,
} from "@/app/components/model-interface/shared/utils";
import { ModelSelectionFiltersNew } from "./ModelSelectionFiltersNew";
import { ModelToggleSwitch } from "@/app/components/ChatBoxInput/ModelToggleSwitch";
import {
  ModelPickerSectionLabel,
  ModelPickerToggleRow,
} from "./ModelPickerSectionLabel";
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
import {
  isModelWalletGatingEnabled,
  partitionModelsByWalletAffordance,
} from "@/app/components/model-interface/features/models/utils/modelWalletAffordance.utils";
import type { ModelSelectionSection } from "./ModelSelectionGrid";

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
  const [mounted, setMounted] = useState(false);
  const [previewedRecentModel, setPreviewedRecentModel] = useState<Model | null>(null);
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

  // Progressive rendering (removed in favor of virtualization)
  const hasAutoSwitchedRef = React.useRef(false);

  // Scroll container ref for virtualization
  const parentRef = React.useRef<HTMLDivElement>(null);

  // Local state for debounced search
  const [localSearch, setLocalSearch] = useState(searchProp);
  const skipNextSyncRef = React.useRef(false);

  // Use the custom hook to manage tab state, filtering and sorting
  // Note: We use localSearch here for filtering to make it feel near-instant,
  // bypassing the lag of updating the parent state and re-rendering the whole tree.
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

  // Debounced sync from local state to hook state (syncs to parent for persistence across tabs/sessions)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearch !== searchProp) {
        skipNextSyncRef.current = true;
        setSearchProp(localSearch);
      }
    }, 400); // Longer debounce for parent sync is fine since filtering is already done locally
    return () => clearTimeout(timer);
  }, [localSearch, setSearchProp, searchProp]);

  const effectiveQuickPickIds = useMemo(
    () => mergeQuickPickIdsForDisplay(models, pinnedModelIds),
    [models, pinnedModelIds],
  );

  const sharedCardProps = useMemo(() => ({
    isModelPinned,
    togglePinModel,
    onSelect: (model: Model) => {
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

  const handlePreviewRecentModel = useCallback((model: Model) => {
    setPreviewedRecentModel(model);
    if (activeTab !== "all") {
      setActiveTab("all");
      setShowFilterSortRow(true);
    }
  }, [activeTab, setActiveTab]);

  // Reset any inline selection when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedModelForDetails(null);
      setPreviewedRecentModel(null);
    }
  }, [isOpen, setSelectedModelForDetails]);

  const handleClose = useCallback(() => {
    setSelectedModelForDetails(null);
    setPreviewedRecentModel(null);
    onClose();
  }, [onClose, setSelectedModelForDetails]);

  const filteredMainModels = useMemo(
    () => previewedRecentModel
      ? mainModelsSorted.filter((m) => m.id !== previewedRecentModel.id)
      : mainModelsSorted,
    [mainModelsSorted, previewedRecentModel],
  );

  const filteredOtherModels = useMemo(
    () => previewedRecentModel
      ? otherModelsSorted.filter((m) => m.id !== previewedRecentModel.id)
      : otherModelsSorted,
    [otherModelsSorted, previewedRecentModel],
  );

  const allModelsFlat = useMemo(() => {
    const list: Model[] = [...filteredMainModels];
    if (previewedRecentModel) {
      list.push(previewedRecentModel);
    }
    list.push(...filteredOtherModels);
    return list;
  }, [filteredMainModels, filteredOtherModels, previewedRecentModel]);

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
    if (previewedRecentModel) {
      sections.push({ title: "Recently picked", models: [previewedRecentModel] });
    }
    if (filteredOtherModels.length > 0) {
      const hasNamedSectionsAbove =
        filteredMainModels.length > 0 || previewedRecentModel != null;
      sections.push({
        title: hasNamedSectionsAbove ? "Others" : "",
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
    previewedRecentModel,
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

  const showAffordabilityToggle = useMemo(() => {
    if (!isModelWalletGatingEnabled()) {
      return false;
    }
    if (wallet === null || wallet === undefined || !Number.isFinite(wallet)) {
      return false;
    }

    const { locked } = partitionModelsByWalletAffordance(
      models,
      wallet,
      avgCostById,
      selectedModel?.id,
    );
    return locked.length > 0;
  }, [wallet, models, avgCostById, selectedModel?.id]);

  // Set initial tab once when the modal opens — not when quick picks change mid-session.
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

  // (Progressive expansion logic removed in favor of virtualization)

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
      className={`fixed inset-0 z-[110] flex ${isMobile ? "items-stretch" : "items-center"} justify-center transition-all duration-200 ease-out p-0`}
      style={{
        background: "var(--modal-overlay)",
        ...(isMobile ? { top: 0, bottom: 0 } : {}),
      }}
    >
      <div
        className={`flex w-full scale-100 flex-col overflow-hidden rounded-xl border opacity-100 shadow-2xl transition-all duration-200 ease-out ${isMobile ? "" : "h-[85vh] max-w-6xl"}`}
        style={{
          background: "var(--modal-bg)",
          borderColor: "var(--modal-border)",
          color: "var(--modal-fg)",
          ...(isMobile ? { height: "100%", maxHeight: "none", borderRadius: 0 } : {}),
        }}
      >
        {/* Header */}
        <div className="flex-shrink-0 border-b" style={{ borderColor: "var(--modal-border)" }}>
          <div className={`flex justify-between items-center ${isMobile ? "px-2 py-0.5" : "px-4 py-0.5"}`}>
            <h2 className={`font-bold ${isMobile ? "text-sm" : "text-lg"}`}>Select Model</h2>
            <button
              className="p-1 transition-colors duration-200 hover:text-red-400"
              style={{ color: "var(--modal-muted-fg)" }}
              onClick={handleClose}
              title="Close model selection"
            >
              <FiX size={isMobile ? 20 : 22} />
            </button>
          </div>
          <RecentModelChips
            recentModels={recentModels}
            highlightedModelId={previewedRecentModel?.id ?? selectedModel?.id}
            onPreview={handlePreviewRecentModel}
            isMobile={isMobile}
          />
        </div>

        {/* Tabs and Filters */}
        <div className={`sticky top-0 z-10 border-b ${isMobile ? "px-2 py-1" : "px-4 py-1"}`} style={{ borderColor: "var(--modal-border)", background: "var(--modal-bg-muted)" }}>
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex flex-shrink-0 overflow-hidden rounded-lg border" style={{ borderColor: "var(--modal-border)" }}>
              <button
                type="button"
                onClick={() => setActiveTab("favorites")}
                className={`app-tab-pill ${activeTab === "favorites" ? "app-tab-pill--active" : ""}`}
              >
                Quick picks
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("all")}
                className={`app-tab-pill border-l ${activeTab === "all" ? "app-tab-pill--active" : ""}`}
                style={{ borderColor: "var(--modal-border)" }}
              >
                All Models
              </button>
              {isAigeniusDesktopRuntime() && (
                <button
                  type="button"
                  onClick={() => setActiveTab("ollama")}
                  className={`app-tab-pill border-l ${activeTab === "ollama" ? "app-tab-pill--active" : ""}`}
                  style={{ borderColor: "var(--modal-border)" }}
                >
                  Ollama
                </button>
              )}
            </div>

            <div className={`${isMobile ? "flex-1 min-w-0" : "flex-1 min-w-0 max-w-xs"} relative`}>
              <input
                type="text"
                placeholder="Search models..."
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
                className="app-modal-input rounded-full px-3 py-1.5 pr-8 text-xs"
              />
              {localSearch && (
                <button
                  onClick={() => setLocalSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 hover:opacity-80"
                  style={{ color: "var(--modal-muted-fg)" }}
                  title="Clear search"
                >
                  <FiX size={14} />
                </button>
              )}
            </div>

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
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col min-h-0">
          <div
            className={`flex-1 min-h-0 overflow-y-auto ${isMobile ? "p-2 pb-3" : "px-2 py-2 pb-6"}`}
            style={{ background: "var(--sidebar-bg)" }}
            ref={parentRef}
          >
            {showAffordabilityToggle && (
              <div className={isMobile ? "px-1" : "px-2"}>
                <ModelPickerToggleRow>
                  <ModelToggleSwitch
                    checked={groupByAffordability}
                    onChange={() =>
                      setGroupByAffordabilityPersisted((prev) => !prev)
                    }
                    label="show me all models I can use"
                    size="xs"
                    variant={groupByAffordability ? "default" : "quiet"}
                  />
                  <ModelPickerSectionLabel
                    onClick={() =>
                      setGroupByAffordabilityPersisted((prev) => !prev)
                    }
                    ariaPressed={groupByAffordability}
                  >
                    show me all models I can use
                  </ModelPickerSectionLabel>
                </ModelPickerToggleRow>
              </div>
            )}
            <ModelSelectionGrid
              parentRef={parentRef}
              hasLeadingControl={showAffordabilityToggle}
              listKey={`${activeTab}-${groupByAffordability ? "afford" : "all"}`}
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
                  : activeTab === "favorites"
                    ? favoritesGridSections
                    : activeTab === "ollama"
                      ? ollamaModelSections
                      : undefined
              }
              emptyState={
                activeTab === "favorites" && !favoritesGridSections
                  ? (
                    <FavoritesEmptyState onBrowse={() => setActiveTab("all")} />
                  )
                  : undefined
              }
              {...sharedCardProps}
            />
            <div className={`${isMobile ? "h-3" : "h-6"}`} />
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent as any, document.getElementById("modal-root") || document.body);
});
