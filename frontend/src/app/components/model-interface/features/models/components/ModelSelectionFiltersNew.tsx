import React, { useMemo } from "react";
import { FiGlobe, FiCheckCircle, FiRotateCcw, FiZap, FiCpu } from "react-icons/fi";
import type { ModelCatalogFilter } from "@/app/components/model-interface/shared/hooks/useModelSelection";
import { FaRegImage } from "react-icons/fa";
import type { Model } from "@/app/components/model-interface/shared/types";
import {
  ModelOrderBy,
  ModelOrderDir,
  getProviderLabel,
  buildLabFilterOptions,
} from "@/app/components/model-interface/shared/utils";
import {
  FilterPillDropdown,
  FilterPillIconButton,
  type FilterPillOption,
} from "./FilterPillDropdown";
import { useLanguage } from "@/lib/providers/LanguageProvider";

interface ModelSelectionFiltersNewProps {
  showFilterSortRow?: boolean;
  setShowFilterSortRow?: (v: boolean | ((prev: boolean) => boolean)) => void;
  orderBy: ModelOrderBy;
  setOrderBy: (v: ModelOrderBy) => void;
  orderDir: ModelOrderDir;
  setOrderDir: (v: ModelOrderDir) => void;
  imageFilterOnly: boolean;
  setImageFilterOnly: (v: boolean | ((prev: boolean) => boolean)) => void;
  selectedProviders: string[];
  setSelectedProviders: (v: string[] | ((prev: string[]) => string[])) => void;
  showWebSearch: boolean;
  setShowWebSearch: (v: boolean) => void;
  majorProviders?: string[];
  models?: Model[];
  labOptions?: FilterPillOption[];
  groupByAffordability?: boolean;
  setGroupByAffordability?: (v: boolean | ((prev: boolean) => boolean)) => void;
  isMobile?: boolean;
  onResetAll?: () => void;
  activeFiltersCount?: number;
  catalogFilter?: ModelCatalogFilter;
  onToggleCatalogFilter?: (filter: ModelCatalogFilter) => void;
  defaultModelsCount?: number;
  ollamaModelsCount?: number;
  showOllamaCatalogFilter?: boolean;
}

function CatalogFilterPill({
  active,
  onClick,
  ariaLabel,
  icon,
  label,
  count,
  activeClassName,
}: {
  active: boolean;
  onClick: () => void;
  ariaLabel: string;
  icon: React.ReactNode;
  label: string;
  count: number;
  activeClassName?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      aria-pressed={active}
      className={`app-filter-pill inline-flex items-center gap-1.5 h-7 px-2.5 text-[11px] font-medium tabular-nums ${
        active ? (activeClassName ?? "app-filter-pill--active") : ""
      }`}
    >
      <span className="opacity-80 shrink-0" aria-hidden>{icon}</span>
      <span className="truncate">{label}</span>
      <span
        className="text-[10px] font-semibold px-1 py-0.5 rounded-md leading-none"
        style={{
          background: active
            ? "color-mix(in srgb, currentColor 14%, transparent)"
            : "color-mix(in srgb, var(--modal-fg) 7%, transparent)",
          color: active ? "inherit" : "var(--sidebar-muted-fg)",
        }}
      >
        {count}
      </span>
    </button>
  );
}

function ToggleSwitch({
  checked,
  onChange,
  ariaLabel,
}: {
  checked: boolean;
  onChange: () => void;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={(e) => {
        e.stopPropagation();
        onChange();
      }}
      className={`relative inline-flex h-4 w-7 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--chat-accent)] ${
        checked
          ? "bg-[var(--chat-accent)]"
          : "bg-black/15 dark:bg-white/20"
      }`}
    >
      <span
        aria-hidden="true"
        className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
          checked ? "translate-x-3" : "translate-x-0"
        }`}
      />
    </button>
  );
}

export const ModelSelectionFiltersNew = React.memo(function ModelSelectionFiltersNew({
  orderBy,
  setOrderBy,
  orderDir,
  setOrderDir,
  imageFilterOnly,
  setImageFilterOnly,
  selectedProviders,
  setSelectedProviders,
  showWebSearch,
  setShowWebSearch,
  majorProviders,
  models,
  labOptions: labOptionsProp,
  groupByAffordability,
  setGroupByAffordability,
  isMobile = false,
  onResetAll,
  activeFiltersCount,
  catalogFilter = "all",
  onToggleCatalogFilter,
  defaultModelsCount = 0,
  ollamaModelsCount = 0,
  showOllamaCatalogFilter = false,
}: ModelSelectionFiltersNewProps) {
  const { t } = useLanguage();
  const selectedProvider = selectedProviders[0] ?? "";

  const sortOptions = useMemo<FilterPillOption[]>(
    () => [
      { value: "default", label: t("modelPicker.sortDefault", "Default") },
      { value: "name", label: t("modelPicker.sortName", "Name") },
      { value: "release_date", label: t("modelPicker.sortReleaseDate", "Release Date") },
      { value: "cost", label: t("modelPicker.sortCost", "Cost") },
      { value: "provider", label: t("modelPicker.sortProvider", "Provider") },
      { value: "context", label: t("modelPicker.sortContext", "Context") },
    ],
    [t],
  );

  const labOptions = useMemo<FilterPillOption[]>(() => {
    const allLabsLabel = t("modelPicker.allLabs", "All labs");
    if (labOptionsProp && labOptionsProp.length > 0) {
      return labOptionsProp.map((opt) =>
        opt.value === "" ? { ...opt, label: allLabsLabel } : opt,
      );
    }
    if (models && models.length > 0) {
      const built = buildLabFilterOptions(models);
      return built.map((opt) =>
        opt.value === "" ? { ...opt, label: allLabsLabel } : opt,
      );
    }
    if (majorProviders && majorProviders.length > 0) {
      return [
        { value: "", label: allLabsLabel },
        ...majorProviders.map((pid) => ({
          value: pid,
          label: getProviderLabel(pid),
        })),
      ];
    }
    const built = buildLabFilterOptions();
    return built.map((opt) =>
      opt.value === "" ? { ...opt, label: allLabsLabel } : opt,
    );
  }, [labOptionsProp, models, majorProviders, t]);

  const hasAnyFilterActive =
    orderBy !== "default" ||
    imageFilterOnly ||
    selectedProviders.length > 0 ||
    showWebSearch ||
    Boolean(groupByAffordability) ||
    catalogFilter !== "all";

  const showCollectionPills =
    onToggleCatalogFilter &&
    (defaultModelsCount > 0 || (showOllamaCatalogFilter && ollamaModelsCount > 0));

  const collectionPills = showCollectionPills ? (
    <div className="flex flex-wrap items-center gap-1.5">
      {defaultModelsCount > 0 && (
        <CatalogFilterPill
          active={catalogFilter === "default"}
          onClick={() => onToggleCatalogFilter!("default")}
          ariaLabel={t("modelPicker.filterDefaultCatalogAria", "Filter to default models, {count} available", {
            count: defaultModelsCount,
          })}
          icon={<FiZap size={11} className="text-amber-500" />}
          label={t("modelPicker.defaultModelsPill", "Default models")}
          count={defaultModelsCount}
          activeClassName="app-filter-pill--default-catalog-active"
        />
      )}
      {showOllamaCatalogFilter && ollamaModelsCount > 0 && (
        <CatalogFilterPill
          active={catalogFilter === "ollama"}
          onClick={() => onToggleCatalogFilter!("ollama")}
          ariaLabel={t("modelPicker.filterOllamaCatalogAria", "Filter to Ollama models, {count} available", {
            count: ollamaModelsCount,
          })}
          icon={<FiCpu size={11} className="text-teal-600 dark:text-teal-400" />}
          label={t("modelPicker.ollamaLabel", "Ollama")}
          count={ollamaModelsCount}
          activeClassName="app-filter-pill--ollama-catalog-active"
        />
      )}
    </div>
  ) : null;

  const handleResetFilters = () => {
    if (onResetAll) {
      onResetAll();
    } else {
      setOrderBy("default");
      setOrderDir("asc");
      setImageFilterOnly(false);
      setSelectedProviders([]);
      setShowWebSearch(false);
      setGroupByAffordability?.(false);
    }
  };

  // Mobile rendering: compact horizontal/wrapped pill controls
  if (isMobile) {
    return (
      <div className="flex flex-col gap-2 pt-1 pb-1">
        {collectionPills}
        <div className="flex items-center gap-1.5 flex-wrap">
          <FilterPillDropdown
            value={orderBy}
            options={sortOptions}
            onChange={(next) => setOrderBy(next as ModelOrderBy)}
            placeholder={t("modelPicker.sort", "Sort")}
            ariaLabel={t("modelPicker.sortModelsAria", "Sort models")}
            forceActive={orderBy !== "default"}
          />

          {orderBy !== "default" ? (
            <FilterPillIconButton
              active
              onClick={() => setOrderDir(orderDir === "asc" ? "desc" : "asc")}
              title={orderDir === "asc" ? t("modelPicker.ascending", "Ascending") : t("modelPicker.descending", "Descending")}
              ariaLabel={t("modelPicker.sortDirectionAria", "Sort direction")}
            >
              <span className="text-[11px] font-semibold leading-none">
                {orderDir === "asc" ? "↑" : "↓"}
              </span>
            </FilterPillIconButton>
          ) : null}

          <FilterPillIconButton
            active={imageFilterOnly}
            activeClassName="app-filter-pill--image-active"
            onClick={() => setImageFilterOnly((prev) => !prev)}
            title={
              imageFilterOnly
                ? t("modelPicker.filesImagesOn", "Files & images – on")
                : t("modelPicker.filesImagesOff", "Files & images – show only models that accept file and image attachments")
            }
            ariaLabel={t("modelPicker.filesImagesAria", "Filter by file and image input")}
          >
            <FaRegImage size={13} />
          </FilterPillIconButton>

          <FilterPillDropdown
            value={selectedProvider}
            options={labOptions}
            onChange={(next) => setSelectedProviders(next ? [next] : [])}
            placeholder={t("modelPicker.labs", "Labs")}
            ariaLabel={t("modelPicker.filterByLabAria", "Filter by lab")}
            forceActive={Boolean(selectedProvider)}
            searchable
            searchPlaceholder={t("modelPicker.searchLabs", "Search labs...")}
          />

          <FilterPillIconButton
            active={showWebSearch}
            activeClassName="app-filter-pill--web-active"
            onClick={() => setShowWebSearch(!showWebSearch)}
            title={
              showWebSearch
                ? t("modelPicker.webSearchOn", "Web search (on)")
                : t("modelPicker.webSearchOff", "Web search – filter by models with web search")
            }
            ariaLabel={t("modelPicker.webSearchAria", "Filter by web search")}
          >
            <FiGlobe size={13} />
          </FilterPillIconButton>

          {groupByAffordability !== undefined && setGroupByAffordability && (
            <FilterPillIconButton
              active={groupByAffordability}
              activeClassName="app-filter-pill--affordability-active"
              onClick={() => setGroupByAffordability((prev) => !prev)}
              title={
                groupByAffordability
                  ? t("modelPicker.affordabilityOn", "Affordable check (on) – showing models you can use")
                  : t("modelPicker.affordabilityOff", "Affordable check – show models I can use")
              }
              ariaLabel={t("modelPicker.affordabilityAria", "Filter by affordability check")}
            >
              <FiCheckCircle size={13} />
            </FilterPillIconButton>
          )}

          {hasAnyFilterActive && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="text-[11px] font-medium text-[var(--chat-accent)] hover:underline px-1 py-1"
            >
              {t("modelPicker.reset", "Reset")}
            </button>
          )}
        </div>
      </div>
    );
  }

  // Desktop sidebar rendering: beautifully grouped vertical sections
  return (
    <div className="space-y-4 pt-1">
      {showCollectionPills && (
        <div className="space-y-1.5">
          <div className="px-1">
            <span className="text-[10px] font-semibold text-[var(--sidebar-muted-fg)] uppercase tracking-wider">
              {t("modelPicker.collections", "Collections")}
            </span>
          </div>
          {collectionPills}
        </div>
      )}

      {/* Filters Section Header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-semibold text-[var(--sidebar-muted-fg)] uppercase tracking-wider">
            {t("modelPicker.filters", "Filters")}
          </span>
          {activeFiltersCount !== undefined && activeFiltersCount > 0 && (
            <span className="inline-flex items-center justify-center px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-[var(--chat-accent)]/15 text-[var(--chat-accent)]">
              {activeFiltersCount}
            </span>
          )}
        </div>
        {hasAnyFilterActive && (
          <button
            type="button"
            onClick={handleResetFilters}
            className="inline-flex items-center gap-1 text-[10px] font-medium text-[var(--chat-accent)] hover:underline transition-colors"
            title={t("modelPicker.resetAllFilters", "Reset all filters")}
          >
            <FiRotateCcw size={10} />
            <span>{t("modelPicker.reset", "Reset")}</span>
          </button>
        )}
      </div>

      {/* Sort By Sub-section */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between px-1">
          <span className="text-[10px] font-semibold text-[var(--sidebar-muted-fg)] uppercase tracking-wider">
            {t("modelPicker.sortBy", "Sort by")}
          </span>
          {orderBy !== "default" && (
            <button
              type="button"
              onClick={() => setOrderBy("default")}
              className="text-[10px] text-[var(--sidebar-muted-fg)] hover:text-[var(--sidebar-fg)] transition-colors"
            >
              {t("modelPicker.sortDefault", "Default")}
            </button>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <div className="flex-1 min-w-0">
            <FilterPillDropdown
              value={orderBy}
              options={sortOptions}
              onChange={(next) => setOrderBy(next as ModelOrderBy)}
              placeholder={t("modelPicker.sortBy", "Sort by")}
              ariaLabel={t("modelPicker.sortModelsAria", "Sort models")}
              forceActive={orderBy !== "default"}
              className="w-full [&>button]:w-full [&>button]:justify-between [&>button]:h-7.5 [&>button]:text-xs"
              labelClassName="truncate flex-1 text-left"
            />
          </div>
          {orderBy !== "default" && (
            <FilterPillIconButton
              active
              onClick={() => setOrderDir(orderDir === "asc" ? "desc" : "asc")}
              title={orderDir === "asc" ? t("modelPicker.ascendingOrder", "Ascending order") : t("modelPicker.descendingOrder", "Descending order")}
              ariaLabel={t("modelPicker.sortDirectionAria", "Sort direction")}
            >
              <span className="text-xs font-bold leading-none">
                {orderDir === "asc" ? "↑" : "↓"}
              </span>
            </FilterPillIconButton>
          )}
        </div>
      </div>

      {/* Capabilities Sub-section */}
      <div className="space-y-1.5">
        <div className="px-1">
          <span className="text-[10px] font-semibold text-[var(--sidebar-muted-fg)] uppercase tracking-wider">
            {t("modelPicker.capabilities", "Capabilities")}
          </span>
        </div>
        <div className="space-y-1">
          {/* Files & Images Toggle Row */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => setImageFilterOnly((prev) => !prev)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setImageFilterOnly((prev) => !prev);
              }
            }}
            className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors select-none ${
              imageFilterOnly
                ? "bg-pink-500/10 text-pink-700 dark:text-pink-400 font-medium"
                : "hover:bg-black/5 dark:hover:bg-white/5 text-[var(--sidebar-muted-fg)] hover:text-[var(--sidebar-fg)]"
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <FaRegImage
                size={13}
                className={imageFilterOnly ? "text-pink-500 shrink-0" : "shrink-0 opacity-70"}
              />
              <span className="text-xs truncate">{t("modelPicker.filesImagesLabel", "Files & Images")}</span>
            </div>
            <ToggleSwitch
              checked={imageFilterOnly}
              onChange={() => setImageFilterOnly((prev) => !prev)}
              ariaLabel={t("modelPicker.filesImagesToggleAria", "Toggle files and images filter")}
            />
          </div>

          {/* Web Search Toggle Row */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => setShowWebSearch(!showWebSearch)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setShowWebSearch(!showWebSearch);
              }
            }}
            className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors select-none ${
              showWebSearch
                ? "bg-blue-500/10 text-blue-700 dark:text-blue-400 font-medium"
                : "hover:bg-black/5 dark:hover:bg-white/5 text-[var(--sidebar-muted-fg)] hover:text-[var(--sidebar-fg)]"
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <FiGlobe
                size={13}
                className={showWebSearch ? "text-blue-500 shrink-0" : "shrink-0 opacity-70"}
              />
              <span className="text-xs truncate">{t("modelPicker.webSearchLabel", "Web Search")}</span>
            </div>
            <ToggleSwitch
              checked={showWebSearch}
              onChange={() => setShowWebSearch(!showWebSearch)}
              ariaLabel={t("modelPicker.webSearchToggleAria", "Toggle web search filter")}
            />
          </div>

          {/* Affordability Toggle Row */}
          {groupByAffordability !== undefined && setGroupByAffordability && (
            <div
              role="button"
              tabIndex={0}
              onClick={() => setGroupByAffordability((prev) => !prev)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setGroupByAffordability((prev) => !prev);
                }
              }}
              className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors select-none ${
                groupByAffordability
                  ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-medium"
                  : "hover:bg-black/5 dark:hover:bg-white/5 text-[var(--sidebar-muted-fg)] hover:text-[var(--sidebar-fg)]"
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <FiCheckCircle
                  size={13}
                  className={groupByAffordability ? "text-emerald-500 shrink-0" : "shrink-0 opacity-70"}
                />
                <span className="text-xs truncate">{t("modelPicker.affordableOnly", "Affordable Only")}</span>
              </div>
              <ToggleSwitch
                checked={groupByAffordability}
                onChange={() => setGroupByAffordability((prev) => !prev)}
                ariaLabel={t("modelPicker.affordableOnlyToggleAria", "Toggle affordable only filter")}
              />
            </div>
          )}
        </div>
      </div>

      {/* Labs Sub-section */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between px-1">
          <span className="text-[10px] font-semibold text-[var(--sidebar-muted-fg)] uppercase tracking-wider">
            {t("modelPicker.labs", "Labs")}
          </span>
          {Boolean(selectedProvider) && (
            <button
              type="button"
              onClick={() => {
                setSelectedProviders([]);
              }}
              className="text-[10px] text-[var(--chat-accent)] hover:underline"
            >
              {t("modelPicker.allLabs", "All labs")}
            </button>
          )}
        </div>

        <FilterPillDropdown
          value={selectedProvider}
          options={labOptions}
          onChange={(next) => setSelectedProviders(next ? [next] : [])}
          placeholder={t("modelPicker.allLabs", "All labs")}
          ariaLabel={t("modelPicker.filterByLabAria", "Filter by lab")}
          forceActive={Boolean(selectedProvider)}
          searchable
          searchPlaceholder={t("modelPicker.searchLabs", "Search labs...")}
          className="w-full [&>button]:w-full [&>button]:justify-between [&>button]:h-7.5 [&>button]:text-xs"
          labelClassName="truncate flex-1 text-left"
        />
      </div>
    </div>
  );
});
