import type { Model } from "@/app/components/model-interface/shared/types";
import {
  formatNGN,
  getModelAverageRequestCredits,
} from "@/app/components/model-interface/shared/utils";
import {
  catalogModalityFromModel,
  type CatalogModality,
} from "./modelConversationEligibility.utils";

export type NonTextModalityFilter =
  | "all"
  | "image"
  | "video"
  | "speech"
  | "transcription";

export function getNonTextModalityCategory(model: Model): CatalogModality {
  const mod = catalogModalityFromModel(model);
  return mod ?? "image";
}

export function getModalityCategoryLabel(
  modality: NonTextModalityFilter | CatalogModality,
): string {
  switch (modality) {
    case "image":
      return "Image Generation";
    case "video":
      return "Video Generation";
    case "speech":
      return "Voice & Speech";
    case "transcription":
      return "Transcription";
    case "audio":
      return "Audio";
    case "all":
      return "All Media";
    default:
      return "Media";
  }
}

export function formatModalitiesDirection(model: Model): string {
  const inputs = model.architecture?.input_modalities;
  const outputs = model.architecture?.output_modalities;

  if (Array.isArray(inputs) && Array.isArray(outputs) && inputs.length > 0 && outputs.length > 0) {
    const inputStr = inputs.map((s) => capitalizeFirstLetter(String(s))).join(" + ");
    const outputStr = outputs.map((s) => capitalizeFirstLetter(String(s))).join(" + ");
    return `${inputStr} → ${outputStr}`;
  }

  const rawModality = model.architecture?.modality;
  if (typeof rawModality === "string" && rawModality.includes("->")) {
    const [inPart, outPart] = rawModality.split("->");
    const formattedIn = inPart
      .split("+")
      .map((s) => capitalizeFirstLetter(s.trim()))
      .join(" + ");
    const formattedOut = outPart
      .split("+")
      .map((s) => capitalizeFirstLetter(s.trim()))
      .join(" + ");
    return `${formattedIn} → ${formattedOut}`;
  }

  const fallbackMod = getNonTextModalityCategory(model);
  return `Text → ${capitalizeFirstLetter(fallbackMod)}`;
}

function capitalizeFirstLetter(val: string): string {
  if (!val) return "";
  return val.charAt(0).toUpperCase() + val.slice(1);
}

function mediaCreditUnit(model: Model): string | undefined {
  const fromAverage = model.averageUserSpendPerRequest?.averageUnit?.trim();
  if (fromAverage) return fromAverage;

  const modality = getNonTextModalityCategory(model);
  if (modality === "image") return "image";
  if (modality === "video") return "video";
  if (modality === "speech" || modality === "audio") return "audio";
  if (modality === "transcription") return "request";
  return undefined;
}

function isListedFreeModel(model: Model): boolean {
  const id = (model.id || "").toLowerCase();
  const name = (model.name || "").toLowerCase();
  return id.endsWith(":free") || id === "openrouter/free" || /\(free\)/.test(name);
}

export function formatNonTextPricing(model: Model): {
  primary: string;
  badge?: string;
} {
  const credits = getModelAverageRequestCredits(model);
  if (Number.isFinite(credits) && credits > 0) {
    const unit = mediaCreditUnit(model);
    const amount = formatNGN(credits, true);
    return { primary: unit ? `~${amount} credits / ${unit}` : `~${amount} credits` };
  }

  if (isListedFreeModel(model)) {
    return { primary: "Free", badge: "Free" };
  }

  return { primary: "Pricing on request" };
}

export function getHighlightedParameters(model: Model): string[] {
  const supported = (model as any)?.supported_parameters;
  if (!Array.isArray(supported) || supported.length === 0) {
    return [];
  }

  const parameterLabels: Record<string, string> = {
    seed: "Seed Control",
    aspect_ratio: "Aspect Ratio",
    resolution: "Resolution",
    duration: "Duration",
    fps: "FPS",
    camera_motion: "Camera Control",
    negative_prompt: "Negative Prompt",
    num_outputs: "Batching",
    quality: "Quality Presets",
    style: "Style Presets",
    voice: "Voice Selection",
    timestamps: "Word Timestamps",
    diarization: "Speaker Diarization",
  };

  return supported
    .map((param) => {
      const key = String(param).toLowerCase();
      return parameterLabels[key] || formatParameterKey(key);
    })
    .slice(0, 4);
}

function formatParameterKey(key: string): string {
  return key
    .split("_")
    .map((w) => capitalizeFirstLetter(w))
    .join(" ");
}
