import type { Model } from "@/app/components/model-interface/shared/types";

const OPENROUTER_ROUTER_IDS = new Set(["openrouter/auto", "openrouter/auto-beta"]);

export type CatalogModality =
  | "text"
  | "image"
  | "audio"
  | "video"
  | "speech"
  | "transcription";

function outputModalitiesOf(model: Model): string[] {
  const outputs = model.architecture?.output_modalities;
  if (!Array.isArray(outputs)) return [];
  return outputs.map((value) => String(value).toLowerCase());
}

/**
 * Mirrors backend `catalogModalityFolder` — output modality drives the product folder.
 */
export function catalogModalityFromModel(model: Model): CatalogModality | null {
  const outputs = outputModalitiesOf(model);
  if (outputs.some((o) => o === "embeddings" || o === "embedding" || o === "rerank")) {
    return null;
  }
  if (outputs.includes("speech")) return "speech";
  if (outputs.includes("transcription")) return "transcription";
  if (outputs.includes("video")) return "video";
  if (outputs.includes("image")) return "image";
  if (outputs.includes("audio")) return "audio";

  const fromApi = model.catalog_modality;
  if (typeof fromApi === "string" && fromApi.length > 0) {
    return fromApi as CatalogModality;
  }

  const pricing = model.pricing as Record<string, unknown> | undefined;
  if (pricing?.video_output != null) return "video";
  if (pricing?.image_output != null) return "image";
  if (pricing?.audio_output != null) return "audio";

  return "text";
}

/** Text-output chat models only — image/video/speech/etc. are catalog preview, not pickable. */
export function isConversationPickableModel(model: Model | null | undefined): boolean {
  if (!model?.id) return false;
  if (OPENROUTER_ROUTER_IDS.has(model.id)) return false;
  return catalogModalityFromModel(model) === "text";
}

export function filterConversationPickableModels(models: Model[]): Model[] {
  return models.filter(isConversationPickableModel);
}

/** Chat UI catalog: text conversation models only (non-text SKUs hidden for now). */
export function filterModelsForChatUiCatalog(models: Model[]): Model[] {
  return filterConversationPickableModels(models);
}

export function filterConversationPickableModelIds(
  models: Model[],
  ids: string[],
): string[] {
  const pickable = new Set(filterConversationPickableModels(models).map((m) => m.id));
  return ids.filter((id) => pickable.has(id));
}
