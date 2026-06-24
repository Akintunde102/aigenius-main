import React from "react";
import { FiSliders, FiGlobe } from "react-icons/fi";
import { FaRegImage } from "react-icons/fa";
import {
  ModelOrderBy,
  ModelOrderDir,
  getProviderLabel,
} from "@/app/components/model-interface/shared/utils";

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
  return (
    <div className="min-w-0 flex-1 overflow-x-auto overflow-y-hidden">
      <div className="flex items-center gap-1.5 flex-nowrap pb-0.5">
        <button
          type="button"
          onClick={() => {
            setShowFilterSortRow((prev) => {
              const next = !prev;
              if (!next) {
                setImageFilterOnly(false);
                setSelectedProviders([]);
                setShowWebSearch(false);
              }
              return next;
            });
          }}
          title="Filter"
          aria-label="Toggle filter"
          className={`inline-flex h-7 w-7 items-center justify-center rounded-md border transition-colors ${showFilterSortRow ? "app-chip--active" : "app-chip"}`}
        >
          <FiSliders size={14} />
        </button>
        <div className="inline-flex items-center gap-1 flex-shrink-0">
          <select
            value={orderBy}
            onChange={(e) => setOrderBy(e.target.value as ModelOrderBy)}
            className="rounded-md border border-gray-200 bg-white text-gray-800 focus:ring-1 focus:ring-blue-500 pl-2 pr-6 py-1 text-[11px] font-medium cursor-pointer min-w-0 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:ring-sky-500"
          >
            <option value="default">Sort</option>
            <option value="name">Name</option>
            <option value="release_date">Release Date</option>
            <option value="cost">Cost</option>
            <option value="provider">Provider</option>
            <option value="context">Context</option>
          </select>
          {orderBy !== "default" && (
            <select
              value={orderDir}
              onChange={(e) => setOrderDir(e.target.value as ModelOrderDir)}
              title={orderDir === "asc" ? "Ascending" : "Descending"}
              aria-label="Sort direction"
              className="rounded-md border border-gray-200 bg-white text-gray-800 pl-1.5 pr-5 py-1 text-[11px] font-medium cursor-pointer flex-shrink-0 w-9 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
            >
              <option value="asc">↑</option>
              <option value="desc">↓</option>
            </select>
          )}
        </div>
        {showFilterSortRow && (
          <button
            type="button"
            onClick={() => setImageFilterOnly((prev) => !prev)}
            title={
              imageFilterOnly
                ? "Image output – on"
                : "Image output – show only models that can generate images"
            }
            className={`inline-flex items-center justify-center rounded-md border w-7 h-7 transition-colors flex-shrink-0 ${imageFilterOnly ? "bg-pink-100 text-pink-700 border-pink-300 dark:bg-pink-950/50 dark:text-pink-300 dark:border-pink-700/70" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50 dark:bg-zinc-900 dark:text-zinc-300 dark:border-zinc-600 dark:hover:bg-zinc-800"}`}
            aria-label="Filter by image output"
          >
            <FaRegImage size={14} />
          </button>
        )}
        {showFilterSortRow &&
          majorProviders.map((pid) => {
            const selected = selectedProviders.includes(pid);
            return (
              <button
                key={pid}
                type="button"
                onClick={() => setSelectedProviders(selected ? [] : [pid])}
                className={`rounded-md border px-2 py-0.5 text-[11px] font-medium transition-colors ${selected ? "app-tab-pill--active border-transparent" : "border-[color:var(--modal-border)] bg-transparent text-[color:var(--modal-muted-fg)] hover:[background-color:var(--sidebar-row-hover)] hover:[color:var(--modal-fg)]"}`}
              >
                {getProviderLabel(pid)}
              </button>
            );
          })}
        {showFilterSortRow && (
          <button
            type="button"
            onClick={() => setShowWebSearch(!showWebSearch)}
            title={
              showWebSearch
                ? "Web search (on)"
                : "Web search – filter by models with web search"
            }
            className={`inline-flex items-center justify-center rounded-md border w-7 h-7 transition-colors flex-shrink-0 ${showWebSearch ? "bg-orange-600 text-white border-orange-600 dark:bg-orange-700 dark:border-orange-700" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50 dark:bg-zinc-900 dark:text-zinc-300 dark:border-zinc-600 dark:hover:bg-zinc-800"}`}
            aria-label="Filter by web search"
          >
            <FiGlobe size={14} />
          </button>
        )}
      </div>
    </div>
  );
});
