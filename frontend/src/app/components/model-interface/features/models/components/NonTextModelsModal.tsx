import React, { useState, useCallback } from "react";
import type { Model } from "@/app/components/model-interface/shared/types";
import { useNonTextModels } from "../hooks/useNonTextModels";
import { NonTextModelCard } from "./NonTextModelCard";
import { NonTextModelFilters } from "./NonTextModelFilters";
import { ModelDetailsModal } from "./ModelDetailsModal";
import type { NonTextModalityFilter } from "../utils/nonTextModelFormatting.utils";
import { useLanguage } from "@/lib/providers/LanguageProvider";
import {
  AppModal,
  AppModalHeader,
  AppModalSearchRow,
  AppModalBody,
} from "@/app/components/modals/AppModal";

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

  const handleClose = () => {
    if (selectedModelForDetails) {
      setSelectedModelForDetails(null);
    } else {
      onClose();
    }
  };

  return (
    <>
      <AppModal
        open={isOpen}
        onClose={handleClose}
        size="xl"
        className="z-[110]"
        ariaLabelledBy="non-text-models-title"
      >
        <AppModalHeader
          titleId="non-text-models-title"
          title={t("modals.mediaModelsTitle", "Media & Creative Models")}
          subtitle={t(
            "modals.mediaModelsSubtitle",
            "Browse image generation, video synthesis, voice/TTS, and transcription models.",
          )}
          onClose={handleClose}
        />

        <AppModalSearchRow
          value={search}
          onChange={setSearch}
          placeholder={t(
            "modals.mediaModelsSearchPlaceholder",
            "Search by model name, provider, parameters (e.g. flux, seed, wan, deepgram)…",
          )}
        />

        {/* Modality Tabs & Filter row */}
        <div
          className="border-b px-4 py-2 shrink-0"
          style={{ borderColor: "var(--modal-border)", background: "transparent" }}
        >
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
        <AppModalBody className="flex-1 overflow-y-auto px-4 py-3 custom-scrollbar">
          {modelsLoading ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16">
              <div
                className="h-7 w-7 animate-spin rounded-full border-2"
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
            <div className="flex flex-col items-center justify-center gap-2 py-14 text-center">
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
                  className="app-modal-btn-primary !text-xs !py-1.5"
                >
                  {t("modals.clearAllFilters", "Clear all filters")}
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 pb-2">
              {filteredModels.map((model) => (
                <NonTextModelCard
                  key={model.id}
                  model={model}
                  onShowDetails={(m: Model) => setSelectedModelForDetails(m)}
                />
              ))}
            </div>
          )}
        </AppModalBody>
      </AppModal>

      {/* Details Lightbox */}
      {selectedModelForDetails && (
        <ModelDetailsModal
          isOpen={Boolean(selectedModelForDetails)}
          onClose={() => setSelectedModelForDetails(null)}
          model={selectedModelForDetails}
        />
      )}
    </>
  );
}
