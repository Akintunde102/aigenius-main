import React, { useMemo } from "react";
import { FiRotateCcw, FiFilm, FiMic, FiFileText } from "react-icons/fi";
import { FaRegImage } from "react-icons/fa";
import {
  FilterPillDropdown,
  type FilterPillOption,
} from "./FilterPillDropdown";
import {
  getProviderLabel,
  type ModelOrderBy,
  type ModelOrderDir,
} from "@/app/components/model-interface/shared/utils";
import type { NonTextModalityFilter } from "../utils/nonTextModelFormatting.utils";
import { useLanguage } from "@/lib/providers/LanguageProvider";

interface NonTextModelFiltersProps {
  selectedModality: NonTextModalityFilter;
  onSelectModality: (modality: NonTextModalityFilter) => void;
  modalityCounts: Record<NonTextModalityFilter, number>;
  selectedProviders: string[];
  onSelectProvider: (provider: string) => void;
  availableProviders: string[];
  orderBy: ModelOrderBy;
  setOrderBy: (orderBy: ModelOrderBy) => void;
  orderDir: ModelOrderDir;
  setOrderDir: (dir: ModelOrderDir) => void;
  activeFiltersCount: number;
  onResetAll: () => void;
  isMobile?: boolean;
}

export function NonTextModelFilters({
  selectedModality,
  onSelectModality,
  modalityCounts,
  selectedProviders,
  onSelectProvider,
  availableProviders,
  orderBy,
  setOrderBy,
  orderDir,
  setOrderDir,
  activeFiltersCount,
  onResetAll,
  isMobile = false,
}: NonTextModelFiltersProps) {
  const { t } = useLanguage();

  const sortOptions = useMemo<FilterPillOption[]>(
    () => [
      { value: "default", label: t("modelPicker.sortDefault", "Default") },
      { value: "name", label: t("modelPicker.sortName", "Name") },
      { value: "provider", label: t("modelPicker.sortProvider", "Provider") },
      { value: "release_date", label: t("modelPicker.sortReleaseDate", "Release Date") },
      { value: "cost", label: t("modelPicker.sortCost", "Cost") },
    ],
    [t],
  );

  const providerOptions: FilterPillOption[] = useMemo(() => {
    const list = availableProviders.map((p) => ({
      value: p,
      label: getProviderLabel(p) || p,
    }));
    return [{ value: "", label: t("modals.allLabs", "All Labs") }, ...list];
  }, [availableProviders, t]);

  const currentProviderValue = selectedProviders[0] || "";

  const modalityTabs: {
    id: NonTextModalityFilter;
    label: string;
    icon: React.ReactNode;
  }[] = useMemo(
    () => [
      { id: "all", label: t("modals.allMedia", "All Media"), icon: null },
      {
        id: "image",
        label: t("modals.imagesModality", "Images"),
        icon: <FaRegImage size={11} className="shrink-0" />,
      },
      {
        id: "video",
        label: t("modals.videosModality", "Videos"),
        icon: <FiFilm size={12} className="shrink-0" />,
      },
      {
        id: "speech",
        label: t("modals.voiceSpeechModality", "Voice & Speech"),
        icon: <FiMic size={12} className="shrink-0" />,
      },
      {
        id: "transcription",
        label: t("modals.transcriptionModality", "Transcription"),
        icon: <FiFileText size={12} className="shrink-0" />,
      },
    ],
    [t],
  );

  return (
    <div className="flex flex-col gap-2.5 w-full">
      {/* Modality Category Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {modalityTabs.map((tab) => {
          const isActive = selectedModality === tab.id;
          const count = modalityCounts[tab.id] || 0;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onSelectModality(tab.id)}
              aria-pressed={isActive}
              className={`app-filter-pill inline-flex items-center gap-1.5 h-7 px-2.5 text-[11px] font-medium whitespace-nowrap tabular-nums transition-colors ${
                isActive ? "app-filter-pill--active" : ""
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
              <span
                className="text-[10px] font-semibold px-1 py-0.5 rounded-md leading-none"
                style={{
                  background: isActive
                    ? "color-mix(in srgb, currentColor 14%, transparent)"
                    : "color-mix(in srgb, var(--modal-fg) 7%, transparent)",
                  color: isActive ? "inherit" : "var(--sidebar-muted-fg)",
                }}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Secondary Row: Provider Filter + Sort + Reset */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {/* Provider Dropdown */}
          <FilterPillDropdown
            value={currentProviderValue}
            options={providerOptions}
            onChange={(val) => onSelectProvider(val)}
            placeholder={t("modals.allLabs", "All Labs")}
            ariaLabel={t("modals.filterByProviderAria", "Filter by provider or lab")}
            searchable={availableProviders.length > 6}
            searchPlaceholder={t("modelPicker.searchLabs", "Search labs...")}
          />

          {/* Sort Dropdown */}
          <FilterPillDropdown
            value={orderBy}
            options={sortOptions}
            onChange={(val) => setOrderBy(val as ModelOrderBy)}
            placeholder={t("modelPicker.sortBy", "Sort by")}
            ariaLabel={t("modals.sortModelsByAria", "Sort models by criteria")}
          />

          {/* Sort direction toggle */}
          {orderBy !== "default" && (
            <button
              type="button"
              className="app-filter-pill inline-flex items-center px-2 h-7 text-[11px] font-medium text-[var(--sidebar-muted-fg)] hover:text-[var(--modal-fg)]"
              onClick={() => setOrderDir(orderDir === "asc" ? "desc" : "asc")}
              title={
                orderDir === "asc"
                  ? t("modals.sortingAscending", "Sorting Ascending")
                  : t("modals.sortingDescending", "Sorting Descending")
              }
            >
              {orderDir === "asc"
                ? t("modals.sortAscShort", "↑ Asc")
                : t("modals.sortDescShort", "↓ Desc")}
            </button>
          )}
        </div>

        {/* Clear/Reset button */}
        {activeFiltersCount > 0 && (
          <button
            type="button"
            className="inline-flex items-center gap-1 text-[11px] font-medium text-[var(--sidebar-muted-fg)] hover:text-[color:var(--chat-accent)] transition-colors py-1 px-1.5"
            onClick={onResetAll}
          >
            <FiRotateCcw size={11} strokeWidth={2} />
            <span>{t("modals.resetFilters", "Reset filters")}</span>
          </button>
        )}
      </div>
    </div>
  );
}
