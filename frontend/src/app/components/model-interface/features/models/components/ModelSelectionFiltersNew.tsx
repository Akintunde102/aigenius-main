import React, { useMemo } from "react";
import { FiSliders, FiGlobe } from "react-icons/fi";
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
  showFilterSortRow: boolean;
  setShowFilterSortRow: (v: boolean | ((prev: boolean) => boolean)) => void;
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
}

const SORT_OPTIONS: FilterPillOption[] = [
  { value: "default", label: "Default" },
  { value: "name", label: "Name" },
  { value: "release_date", label: "Release Date" },
  { value: "cost", label: "Cost" },
  { value: "provider", label: "Provider" },
  { value: "context", label: "Context" },
];

export const ModelSelectionFiltersNew = React.memo(function ModelSelectionFiltersNew({
  showFilterSortRow,
  setShowFilterSortRow,
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

  const clearSecondaryFilters = () => {
    setImageFilterOnly(false);
    setSelectedProviders([]);
    setShowWebSearch(false);
  };

  return (
    <div className="min-w-0 flex-1 overflow-x-auto overflow-y-hidden">
      <div className="flex items-center gap-1.5 flex-nowrap pb-0.5">
        <FilterPillIconButton
          active={showFilterSortRow}
          onClick={() => {
            setShowFilterSortRow((prev) => {
              const next = !prev;
              if (!next) clearSecondaryFilters();
              return next;
            });
          }}
          title="Filter"
          ariaLabel="Toggle filter"
        >
          <FiSliders size={13} />
        </FilterPillIconButton>

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

        {showFilterSortRow ? (
          <>
            <FilterPillIconButton
              active={imageFilterOnly}
              activeClassName="app-filter-pill--image-active"
              onClick={() => setImageFilterOnly((prev) => !prev)}
              title={
                imageFilterOnly
                  ? "Image output – on"
                  : "Image output – show only models that can generate images"
              }
              ariaLabel="Filter by image output"
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
          </>
        ) : null}
      </div>
    </div>
  );
});
