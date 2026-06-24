import React from "react";
import { SavedChatsModal } from "./SavedChatsModal";
import { ModelDetailsModal } from "../../models/components";
import { ModelSelectionModal } from "../../models/components";
import {
  Model,
  ChatMessage,
} from "@/app/components/model-interface/shared/types";
import {
  ModelOrderBy,
  ModelOrderDir,
} from "@/app/components/model-interface/shared/utils";

interface ModalContainerProps {
  // Saved chats modal
  showSaved: boolean;
  setShowSaved: (show: boolean) => void;
  savedChats: ChatMessage[];
  onInsertSaved: (msg: ChatMessage) => void;
  onRemoveSaved: (id: string) => void;

  // Model details modal
  showModelDetailsModal: boolean;
  setShowModelDetailsModal: (show: boolean) => void;
  selectedModelForDetails: Model | null;

  // Model selection modal
  showModelSelectionModal: boolean;
  setShowModelSelectionModal: (show: boolean) => void;
  models: Model[];
  search: string;
  setSearch: (search: string) => void;
  selectedModel: Model | null;
  setSelectedModel: (model: Model | null) => void;
  setSelectedModelForDetails: (model: Model | null) => void;
  handleShowModelDetails: (model: Model) => void;
  allModalities: string[];
  selectedModalities: string[];
  toggleModality: (mod: string) => void;
  allOutputModalities: string[];
  selectedOutputModalities: string[];
  toggleOutputModality: (mod: string) => void;
  showWebSearch: boolean;
  setShowWebSearch: (show: boolean) => void;
  showToolsOnly: boolean;
  setShowToolsOnly: (show: boolean) => void;
  orderByCost: "none" | "asc" | "desc";
  setOrderByCost: (order: "none" | "asc" | "desc") => void;
  pinnedModelIds: string[];
  isModelPinned: (id: string) => boolean;
  togglePinModel: (id: string) => void;
  favoritesLoaded?: boolean;
  recentModels?: Model[];
  // New filter/sort (when !SHOW_LEGACY_FILTERS)
  orderBy?: ModelOrderBy;
  setOrderBy?: (v: ModelOrderBy) => void;
  orderDir?: ModelOrderDir;
  setOrderDir?: (v: ModelOrderDir) => void;
  selectedProviders?: string[];
  setSelectedProviders?: (v: string[] | ((prev: string[]) => string[])) => void;
  imageFilterOnly?: boolean;
  setImageFilterOnly?: (v: boolean | ((prev: boolean) => boolean)) => void;
}

export function ModalContainer({
  // Saved chats modal props
  showSaved,
  setShowSaved,
  savedChats,
  onInsertSaved,
  onRemoveSaved,

  // Model details modal props
  showModelDetailsModal,
  setShowModelDetailsModal,
  selectedModelForDetails,

  // Model selection modal props
  showModelSelectionModal,
  setShowModelSelectionModal,
  models,
  search,
  setSearch,
  selectedModel,
  setSelectedModel,
  setSelectedModelForDetails,
  handleShowModelDetails,
  allModalities,
  selectedModalities,
  toggleModality,
  allOutputModalities,
  selectedOutputModalities,
  toggleOutputModality,
  showWebSearch,
  setShowWebSearch,
  showToolsOnly,
  setShowToolsOnly,
  orderByCost,
  setOrderByCost,
  pinnedModelIds,
  isModelPinned,
  togglePinModel,
  favoritesLoaded,
  recentModels = [],
  orderBy,
  setOrderBy,
  orderDir,
  setOrderDir,
  selectedProviders = [],
  setSelectedProviders,
  imageFilterOnly = false,
  setImageFilterOnly,
}: ModalContainerProps) {
  return (
    <>
      <SavedChatsModal
        isOpen={showSaved}
        onClose={() => setShowSaved(false)}
        savedChats={savedChats}
        onInsertSaved={onInsertSaved}
        onRemoveSaved={onRemoveSaved}
      />

      <ModelDetailsModal
        isOpen={showModelDetailsModal}
        onClose={() => setShowModelDetailsModal(false)}
        model={selectedModelForDetails}
        onPickModel={(model) => {
          setSelectedModel(model);
          setShowModelDetailsModal(false);
        }}
      />

      <ModelSelectionModal
        isOpen={showModelSelectionModal}
        onClose={() => setShowModelSelectionModal(false)}
        models={models}
        search={search}
        setSearch={setSearch}
        selectedModel={selectedModel}
        setSelectedModel={setSelectedModel}
        selectedModelForDetails={selectedModelForDetails}
        setSelectedModelForDetails={setSelectedModelForDetails}
        allModalities={allModalities}
        selectedModalities={selectedModalities}
        toggleModality={toggleModality}
        allOutputModalities={allOutputModalities}
        selectedOutputModalities={selectedOutputModalities}
        toggleOutputModality={toggleOutputModality}
        showWebSearch={showWebSearch}
        setShowWebSearch={setShowWebSearch}
        showToolsOnly={showToolsOnly}
        setShowToolsOnly={setShowToolsOnly}
        orderByCost={orderByCost}
        setOrderByCost={setOrderByCost}
        pinnedModelIds={pinnedModelIds}
        isModelPinned={isModelPinned}
        togglePinModel={togglePinModel}
        favoritesLoaded={favoritesLoaded}
        recentModels={recentModels}
        orderBy={orderBy}
        setOrderBy={setOrderBy}
        orderDir={orderDir}
        setOrderDir={setOrderDir}
        selectedProviders={selectedProviders}
        setSelectedProviders={setSelectedProviders}
        imageFilterOnly={imageFilterOnly}
        setImageFilterOnly={setImageFilterOnly}
        handleShowModelDetails={handleShowModelDetails}
      />
    </>
  );
}
