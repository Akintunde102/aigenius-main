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
import { useModelSelection } from "@/app/components/model-interface/shared/hooks/useModelSelection";
import { RecentModelChips } from "./RecentModelChips";
import { ModelSelectionGrid } from "./ModelSelectionGrid";
import { FavoritesEmptyState } from "./FavoritesEmptyState";
import { isAigeniusDesktopRuntime } from "@/lib/utils/desktop-runtime";

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
}: ModelSelectionModalProps) => {
  const [isMobile, setIsMobile] = useState(false);
  const [showFilterSortRow, setShowFilterSortRow] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [previewedRecentModel, setPreviewedRecentModel] = useState<Model | null>(null);

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
  }), [isModelPinned, togglePinModel, setSelectedModel, onClose, avgCostById, selectedModel?.id, handleShowModelDetails, isMobile, orderBy]);

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

  const allModelSections = useMemo(() => {
    const sections = [];
    if (filteredMainModels.length > 0) {
      sections.push({ title: "Main models", models: filteredMainModels });
    }
    if (previewedRecentModel) {
      sections.push({ title: "Recently picked", models: [previewedRecentModel] });
    }
    sections.push({ title: "Others", models: filteredOtherModels });
    return sections;
  }, [filteredMainModels, filteredOtherModels, previewedRecentModel]);

  // Auto-switch to "all" if favorites are empty
  useEffect(() => {
    if (!hasAutoSwitchedRef.current && favoritesLoaded && pinnedModelIds.length === 0 && activeTab === "favorites") {
      hasAutoSwitchedRef.current = true;
      setActiveTab("all");
    }
  }, [favoritesLoaded, pinnedModelIds.length, activeTab, setActiveTab]);

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
                onClick={() => { setActiveTab("favorites"); setShowFilterSortRow(false); }}
                className={`app-tab-pill ${activeTab === "favorites" ? "app-tab-pill--active" : ""}`}
              >
                Favorites
              </button>
              <button
                type="button"
                onClick={() => { setActiveTab("all"); setShowFilterSortRow(true); }}
                className={`app-tab-pill border-l ${activeTab === "all" ? "app-tab-pill--active" : ""}`}
                style={{ borderColor: "var(--modal-border)" }}
              >
                All Models
              </button>
              {isAigeniusDesktopRuntime() && (
                <button
                  type="button"
                  onClick={() => { setActiveTab("ollama"); setShowFilterSortRow(true); }}
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
          <div className={`flex-1 min-h-0 overflow-y-auto ${isMobile ? "p-2 pb-4" : "p-4 pb-8"}`} ref={parentRef}>
            <ModelSelectionGrid
              parentRef={parentRef}
              models={
                activeTab === "favorites" ? favoritesSorted :
                  activeTab === "ollama" ? ollamaModelsSorted :
                    undefined
              }
              sections={
                activeTab === "all"
                  ? allModelSections
                  : undefined
              }
              emptyState={activeTab === "favorites" ? (
                <FavoritesEmptyState onBrowse={() => setActiveTab("all")} />
              ) : undefined}
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
