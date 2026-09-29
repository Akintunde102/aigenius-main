import React, { useMemo } from "react";
import { FiGlobe, FiCheckCircle, FiRotateCcw } from "react-icons/fi";
import { FaRegImage } from "react-icons/fa";
import {
  ModelOrderBy,
  ModelOrderDir,
  getProviderLabel,
} from "@/app/components/model-interface/shared/utils";
import {
  FilterPillDropdown,
  FilterPillIconButton,
  type FilterPillOption,
} from "./FilterPillDropdown";

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
  majorProviders: string[];
  groupByAffordability?: boolean;
  setGroupByAffordability?: (v: boolean | ((prev: boolean) => boolean)) => void;
  isMobile?: boolean;
  onResetAll?: () => void;
  activeFiltersCount?: number;
}

const SORT_OPTIONS: FilterPillOption[] = [
  { value: "default", label: "Default" },
  { value: "name", label: "Name" },
  { value: "release_date", label: "Release Date" },
  { value: "cost", label: "Cost" },
  { value: "provider", label: "Provider" },
  { value: "context", label: "Context" },
];

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
  groupByAffordability,
  setGroupByAffordability,
  isMobile = false,
  onResetAll,
  activeFiltersCount,
}: ModelSelectionFiltersNewProps) {
  const selectedProvider = selectedProviders[0] ?? "";

  const labOptions = useMemo<FilterPillOption[]>(
    () => [
      { value: "", label: "All labs" },
      ...majorProviders.map((pid) => ({
        value: pid,
        label: getProviderLabel(pid),
      })),
    ],
    [majorProviders],
  );

  const hasAnyFilterActive =
    orderBy !== "default" ||
    imageFilterOnly ||
    selectedProviders.length > 0 ||
    showWebSearch ||
    Boolean(groupByAffordability);

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
        <div className="flex items-center gap-1.5 flex-wrap">
          <FilterPillDropdown
            value={orderBy}
            options={SORT_OPTIONS}
            onChange={(next) => setOrderBy(next as ModelOrderBy)}
            placeholder="Sort"
            ariaLabel="Sort models"
            forceActive={orderBy !== "default"}
          />

          {orderBy !== "default" ? (
            <FilterPillIconButton
              active
              onClick={() => setOrderDir(orderDir === "asc" ? "desc" : "asc")}
              title={orderDir === "asc" ? "Ascending" : "Descending"}
              ariaLabel="Sort direction"
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
                ? "Files & images – on"
                : "Files & images – show only models that accept file and image attachments"
            }
            ariaLabel="Filter by file and image input"
          >
            <FaRegImage size={13} />
          </FilterPillIconButton>

          <FilterPillDropdown
            value={selectedProvider}
            options={labOptions}
            onChange={(next) => setSelectedProviders(next ? [next] : [])}
            placeholder="Labs"
            ariaLabel="Filter by lab"
            forceActive={Boolean(selectedProvider)}
          />

          <FilterPillIconButton
            active={showWebSearch}
            activeClassName="app-filter-pill--web-active"
            onClick={() => setShowWebSearch(!showWebSearch)}
            title={
              showWebSearch
                ? "Web search (on)"
                : "Web search – filter by models with web search"
            }
            ariaLabel="Filter by web search"
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
                  ? "Affordable check (on) – showing models you can use"
                  : "Affordable check – show models I can use"
              }
              ariaLabel="Filter by affordability check"
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
              Reset
            </button>
          )}
        </div>
      </div>
    );
  }

  // Desktop sidebar rendering: beautifully grouped vertical sections
  return (
    <div className="space-y-4 pt-1">
      {/* Filters Section Header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-semibold text-[var(--sidebar-muted-fg)] uppercase tracking-wider">
            Filters
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
            title="Reset all filters"
          >
            <FiRotateCcw size={10} />
            <span>Reset</span>
          </button>
        )}
      </div>

      {/* Sort By Sub-section */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between px-1">
          <span className="text-[10px] font-semibold text-[var(--sidebar-muted-fg)] uppercase tracking-wider">
            Sort by
          </span>
          {orderBy !== "default" && (
            <button
              type="button"
              onClick={() => setOrderBy("default")}
              className="text-[10px] text-[var(--sidebar-muted-fg)] hover:text-[var(--sidebar-fg)] transition-colors"
            >
              Default
            </button>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <div className="flex-1 min-w-0">
            <FilterPillDropdown
              value={orderBy}
              options={SORT_OPTIONS}
              onChange={(next) => setOrderBy(next as ModelOrderBy)}
              placeholder="Sort by"
              ariaLabel="Sort models"
              forceActive={orderBy !== "default"}
              className="w-full [&>button]:w-full [&>button]:justify-between [&>button]:h-7.5 [&>button]:text-xs"
              labelClassName="truncate flex-1 text-left"
            />
          </div>
          {orderBy !== "default" && (
            <FilterPillIconButton
              active
              onClick={() => setOrderDir(orderDir === "asc" ? "desc" : "asc")}
              title={orderDir === "asc" ? "Ascending order" : "Descending order"}
              ariaLabel="Sort direction"
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
            Capabilities
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
              <span className="text-xs truncate">Files & Images</span>
            </div>
            <ToggleSwitch
              checked={imageFilterOnly}
              onChange={() => setImageFilterOnly((prev) => !prev)}
              ariaLabel="Toggle files and images filter"
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
              <span className="text-xs truncate">Web Search</span>
            </div>
            <ToggleSwitch
              checked={showWebSearch}
              onChange={() => setShowWebSearch(!showWebSearch)}
              ariaLabel="Toggle web search filter"
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
                <span className="text-xs truncate">Affordable Only</span>
              </div>
              <ToggleSwitch
                checked={groupByAffordability}
                onChange={() => setGroupByAffordability((prev) => !prev)}
                ariaLabel="Toggle affordable only filter"
              />
            </div>
          )}
        </div>
      </div>

      {/* Labs Sub-section */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between px-1">
          <span className="text-[10px] font-semibold text-[var(--sidebar-muted-fg)] uppercase tracking-wider">
            Labs
          </span>
          {Boolean(selectedProvider) && (
            <button
              type="button"
              onClick={() => setSelectedProviders([])}
              className="text-[10px] text-[var(--chat-accent)] hover:underline"
            >
              All labs
            </button>
          )}
        </div>
        <FilterPillDropdown
          value={selectedProvider}
          options={labOptions}
          onChange={(next) => setSelectedProviders(next ? [next] : [])}
          placeholder="All labs"
          ariaLabel="Filter by lab"
          forceActive={Boolean(selectedProvider)}
          className="w-full [&>button]:w-full [&>button]:justify-between [&>button]:h-7.5 [&>button]:text-xs"
          labelClassName="truncate flex-1 text-left"
        />
      </div>
    </div>
  );
});
