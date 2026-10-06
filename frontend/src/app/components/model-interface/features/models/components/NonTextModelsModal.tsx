import React, { useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { FiX, FiSearch, FiSliders, FiFilm, FiHelpCircle } from "react-icons/fi";
import type { Model } from "@/app/components/model-interface/shared/types";
import { useNonTextModels } from "../hooks/useNonTextModels";
import { NonTextModelCard } from "./NonTextModelCard";
import { NonTextModelFilters } from "./NonTextModelFilters";
import { ModelDetailsModal } from "./ModelDetailsModal";
import type { NonTextModalityFilter } from "../utils/nonTextModelFormatting.utils";
import { useLanguage } from "@/lib/providers/LanguageProvider";

export interface NonTextModelsModalProps {
  isOpen: boolean;
  onClose: () => void;
  models: Model[];
  modelsLoading?: boolean;
  initialModality?: NonTextModalityFilter;
}

export function NonTextModelsModal({
  isOpen,
  onClose,
  models,
  modelsLoading = false,
  initialModality = "all",
}: NonTextModelsModalProps) {
  const { t } = useLanguage();
  const [mounted, setMounted] = useState(false);
  const [selectedModelForDetails, setSelectedModelForDetails] =
    useState<Model | null>(null);

  const {
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
  } = useNonTextModels({
    models,
    initialModality,
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (selectedModelForDetails) {
          setSelectedModelForDetails(null);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose, selectedModelForDetails]);

  const handleProviderSelect = useCallback(
    (provider: string) => {
      if (!provider) {
        setSelectedProviders([]);
      } else {
        setSelectedProviders([provider]);
      }
    },
    [setSelectedProviders],
  );

  if (!isOpen || !mounted) return null;

  const portalTarget =
    typeof document !== "undefined"
      ? document.getElementById("modal-root") ?? document.body
      : null;
  if (!portalTarget) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center p-3 sm:p-4 md:p-6 backdrop-blur-sm transition-opacity duration-200"
      style={{ background: "var(--modal-overlay)" }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="non-text-models-title"
    >
      <div
        className="relative flex flex-col w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl border shadow-2xl transition-all"
        style={{
          background: "var(--modal-bg)",
          borderColor: "var(--modal-border)",
          color: "var(--modal-fg)",
          boxShadow:
            "0 25px 60px -15px rgba(0, 0, 0, 0.4), 0 0 0 1px var(--modal-border)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex-shrink-0 px-5 sm:px-6 pt-5 pb-4 border-b"
          style={{ borderColor: "var(--modal-border)" }}
        >
          <div className="flex items-start justify-between gap-4 mb-3">
            <div>
              <div className="flex items-center gap-2">
                <div
                  className="flex h-7 w-7 items-center justify-center rounded-lg"
                  style={{
                    background: "color-mix(in srgb, var(--chat-accent) 15%, transparent)",
                    color: "var(--chat-accent)",
                  }}
                >
                  <FiFilm size={15} strokeWidth={2} />
                </div>
                <h3
                  id="non-text-models-title"
                  className="text-base sm:text-lg font-semibold tracking-tight"
                >
                  {t("modals.mediaModelsTitle", "Media & Creative Models")}
                </h3>
              </div>
              <p
                className="text-xs mt-1"
                style={{ color: "var(--sidebar-muted-fg)" }}
              >
                {t("modals.mediaModelsSubtitle", "Browse image generation, video synthesis, voice/TTS, and transcription models. Catalog preview only.")}
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--sidebar-muted-fg)] transition-colors hover:text-[var(--modal-fg)] hover:bg-black/5 dark:hover:bg-white/10"
              aria-label={t("modals.closeModalAria", "Close modal")}
            >
              <FiX size={18} strokeWidth={2} />
            </button>
          </div>

          {/* Search bar */}
          <div className="relative w-full mb-3">
            <FiSearch
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-50"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("modals.mediaModelsSearchPlaceholder", "Search by model name, provider, parameters (e.g. flux, seed, wan, deepgram)…")}
              className="w-full h-9 pl-9 pr-8 text-xs rounded-xl border transition-all focus:outline-none focus:ring-2 focus:ring-[color:var(--chat-accent)]"
              style={{
                background: "color-mix(in srgb, var(--modal-fg) 4%, transparent)",
                borderColor: "var(--modal-border)",
                color: "var(--modal-fg)",
              }}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--sidebar-muted-fg)] hover:text-[var(--modal-fg)]"
                aria-label={t("modelPicker.clearSearch", "Clear search")}
              >
                <FiX size={13} />
              </button>
            )}
          </div>

          {/* Modality Tabs & Filters */}
          <NonTextModelFilters
            selectedModality={selectedModality}
            onSelectModality={setSelectedModality}
            modalityCounts={modalityCounts}
            selectedProviders={selectedProviders}
            onSelectProvider={handleProviderSelect}
            availableProviders={availableProviders}
            orderBy={orderBy}
            setOrderBy={setOrderBy}
            orderDir={orderDir}
            setOrderDir={setOrderDir}
            activeFiltersCount={activeFiltersCount}
            onResetAll={resetFilters}
          />
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-4 scrollbar-thin">
          {modelsLoading ? (
            <div className="flex flex-col items-center justify-center gap-3 py-20">
              <div
                className="h-8 w-8 animate-spin rounded-full border-2"
                style={{
                  borderColor: "var(--modal-border)",
                  borderTopColor: "var(--chat-accent)",
                }}
              />
              <p className="text-xs" style={{ color: "var(--sidebar-muted-fg)" }}>
                {t("modals.mediaModelsLoading", "Loading media models catalog…")}
              </p>
            </div>
          ) : filteredModels.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
              <p className="text-sm font-semibold">{t("modals.mediaModelsNoMatch", "No models match your filter")}</p>
              <p
                className="text-xs max-w-sm mb-2"
                style={{ color: "var(--sidebar-muted-fg)" }}
              >
                {t("modals.mediaModelsNoMatchHint", "Try changing your search terms, selecting a different modality tab, or clearing the provider filter.")}
              </p>
              {activeFiltersCount > 0 && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                  style={{
                    background: "var(--chat-accent)",
                    color: "var(--chat-canvas-bg)",
                  }}
                >
                  {t("modals.clearAllFilters", "Clear all filters")}
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredModels.map((m) => (
                <NonTextModelCard
                  key={m.id}
                  model={m}
                  onShowDetails={(mod) => setSelectedModelForDetails(mod)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer info note */}
        <div
          className="flex-shrink-0 px-5 sm:px-6 py-3 border-t flex items-center justify-between gap-3 text-xs"
          style={{
            borderColor: "var(--modal-border)",
            background: "color-mix(in srgb, var(--modal-fg) 2%, transparent)",
            color: "var(--sidebar-muted-fg)",
          }}
        >
          <div className="flex items-center gap-1.5">
            <FiHelpCircle size={13} className="shrink-0" />
            <span>
              {t("modals.mediaModelsFooter", "Showing {shown} of {total} media models. These models are accessed via tools or APIs.", {
                shown: filteredModels.length,
                total: models.length,
              })}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-lg text-xs font-medium hover:bg-black/5 dark:hover:bg-white/10"
          >
            {t("common.close", "Close")}
          </button>
        </div>
      </div>

      {/* Reusable details modal */}
      {selectedModelForDetails && (
        <ModelDetailsModal
          isOpen={Boolean(selectedModelForDetails)}
          onClose={() => setSelectedModelForDetails(null)}
          model={selectedModelForDetails}
        />
      )}
    </div>,
    portalTarget,
  );
}

export default NonTextModelsModal;
