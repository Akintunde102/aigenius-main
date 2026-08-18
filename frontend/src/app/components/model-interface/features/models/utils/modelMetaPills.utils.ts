import { Model } from "@/app/components/model-interface/shared/types";
import {
  formatNGN,
  getModalityDisplay,
  getProvider,
  getProviderLabel,
} from "@/app/components/model-interface/shared/utils";

export type ModelMetaPill = {
  key: string;
  label: string;
  tone?: "default" | "cost" | "release";
};

export function formatContextLength(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M ctx`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K ctx`;
  return `${n} ctx`;
}

function formatReleaseDate(created?: number): string {
  if (!created) return "";
  return new Date(created * 1000).toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function collectNonTextModalities(model: Model): string[] {
  const seen = new Set<string>();
  const labels: string[] = [];

  const add = (mod: string) => {
    const normalized = (mod || "").trim().toLowerCase();
    if (!normalized || normalized === "text" || seen.has(normalized)) return;
    seen.add(normalized);
    labels.push(getModalityDisplay(mod).label);
  };

  (model.architecture?.input_modalities ?? []).forEach(add);
  (model.architecture?.output_modalities ?? []).forEach(add);

  return labels.slice(0, 3);
}

export function buildModelMetaPills(
  model: Model,
  averageCost: number,
): ModelMetaPill[] {
  const pills: ModelMetaPill[] = [];

  const provider = getProvider(model.id);
  const providerLabel = getProviderLabel(provider);
  if (providerLabel && provider !== "openrouter") {
    pills.push({ key: "provider", label: providerLabel });
  }

  const releaseLabel = formatReleaseDate(model.created);
  if (releaseLabel) {
    pills.push({ key: "release", label: releaseLabel, tone: "release" });
  }

  const contextLabel = formatContextLength(model.context_length);
  if (contextLabel) {
    pills.push({ key: "context", label: contextLabel });
  }

  if (Number.isFinite(averageCost)) {
    if (averageCost > 0) {
      pills.push({
        key: "cost",
        label: `~${formatNGN(averageCost, true)} credits/msg`,
        tone: "cost",
      });
    } else {
      pills.push({ key: "cost", label: "Free", tone: "cost" });
    }
  }

  collectNonTextModalities(model).forEach((label, index) => {
    pills.push({ key: `modality-${index}-${label}`, label });
  });

  return pills;
}
