import React, { memo, useState } from "react";
import {
  FiInfo,
  FiCopy,
  FiCheck,
  FiFilm,
  FiMic,
  FiFileText,
  FiImage,
} from "react-icons/fi";
import { FaRegImage } from "react-icons/fa";
import type { Model } from "@/app/components/model-interface/shared/types";
import {
  getModelDisplayName,
  getProvider,
  getProviderLabel,
} from "@/app/components/model-interface/shared/utils";
import {
  getNonTextModalityCategory,
  formatModalitiesDirection,
  formatNonTextPricing,
  getHighlightedParameters,
} from "../utils/nonTextModelFormatting.utils";
import { useLanguage } from "@/lib/providers/LanguageProvider";

interface NonTextModelCardProps {
  model: Model;
  onShowDetails: (model: Model) => void;
  isMobile?: boolean;
}

function ModalityIconBadge({ category }: { category: string }) {
  const { t } = useLanguage();
  switch (category) {
    case "video":
      return (
        <span
          className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold text-rose-500 bg-rose-500/10 border border-rose-500/20"
          title={t("modelPicker.videoGenerationTitle", "Video Generation")}
        >
          <FiFilm size={11} strokeWidth={2} />
          <span>Video</span>
        </span>
      );
    case "speech":
    case "audio":
      return (
        <span
          className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold text-amber-500 bg-amber-500/10 border border-amber-500/20"
          title={t("modelPicker.voiceSpeechTitle", "Voice & Speech Synthesis")}
        >
          <FiMic size={11} strokeWidth={2} />
          <span>Voice</span>
        </span>
      );
    case "transcription":
      return (
        <span
          className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold text-emerald-500 bg-emerald-500/10 border border-emerald-500/20"
          title={t("modelPicker.transcriptionTitle", "Speech-to-Text Transcription")}
        >
          <FiFileText size={11} strokeWidth={2} />
          <span>STT</span>
        </span>
      );
    case "image":
    default:
      return (
        <span
          className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold text-sky-500 bg-sky-500/10 border border-sky-500/20"
          title={t("modelPicker.imageGenerationTitle", "Image Generation")}
        >
          <FaRegImage size={10} />
          <span>Image</span>
        </span>
      );
  }
}

export const NonTextModelCard = memo(function NonTextModelCard({
  model,
  onShowDetails,
  isMobile = false,
}: NonTextModelCardProps) {
  const { t } = useLanguage();
  const [copied, setCopied] = useState(false);
  const displayName = getModelDisplayName(model);
  const provider = getProvider(model.id);
  const providerLabel = getProviderLabel(provider) || provider;
  const category = getNonTextModalityCategory(model);
  const modalityDirection = formatModalitiesDirection(model);
  const pricingInfo = formatNonTextPricing(model);
  const parameters = getHighlightedParameters(model);

  const handleCopyId = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(model.id);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }
  };

  const handleCardClick = () => {
    onShowDetails(model);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      className={`group relative flex flex-col justify-between w-full rounded-xl border p-3.5 transition-all duration-150 hover:shadow-md cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--chat-accent)] ${
        isMobile ? "p-3" : "p-3.5"
      }`}
      style={{
        background: "var(--modal-bg)",
        borderColor: "var(--modal-border)",
        color: "var(--modal-fg)",
      }}
      onClick={handleCardClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleCardClick();
        }
      }}
      aria-label={`${displayName} — ${category} model, click to view details`}
    >
      <div>
        {/* Top Header: Modality + Provider + Actions */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <ModalityIconBadge category={category} />
            <span
              className="truncate text-[11px] font-medium px-2 py-0.5 rounded-full"
              style={{
                background: "color-mix(in srgb, var(--modal-fg) 7%, transparent)",
                color: "var(--sidebar-muted-fg)",
              }}
            >
              {providerLabel}
            </span>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              className="flex h-6 w-6 items-center justify-center rounded-md text-[var(--sidebar-muted-fg)] transition-colors hover:text-[var(--modal-fg)] hover:bg-black/5 dark:hover:bg-white/10"
              onClick={handleCopyId}
              title={
                copied
                  ? t("modelPicker.copiedModelId", "Copied ID!")
                  : t("modelPicker.copyModelId", "Copy model ID ({id})", { id: model.id })
              }
              aria-label={t("modelPicker.copyModelIdAria", "Copy model ID")}
            >
              {copied ? (
                <FiCheck size={12} className="text-emerald-500" />
              ) : (
                <FiCopy size={12} strokeWidth={1.75} />
              )}
            </button>
            <button
              type="button"
              className="flex h-6 w-6 items-center justify-center rounded-md text-[var(--sidebar-muted-fg)] transition-colors hover:text-[var(--modal-fg)] hover:bg-black/5 dark:hover:bg-white/10"
              onClick={(e) => {
                e.stopPropagation();
                onShowDetails(model);
              }}
              title={t("modelPicker.viewSpecsPricing", "View full specs & pricing")}
              aria-label={t("modelPicker.viewModelDetailsAria", "View model details")}
            >
              <FiInfo size={12} strokeWidth={1.75} />
            </button>
          </div>
        </div>

        {/* Title */}
        <h4 className="text-sm font-semibold truncate mb-1 group-hover:text-[color:var(--chat-accent)] transition-colors">
          {displayName}
        </h4>

        {/* Direction & Pricing */}
        <div className="flex flex-wrap items-center gap-2 mb-2 text-[11px]">
          <span
            className="font-medium text-[var(--sidebar-muted-fg)] truncate max-w-[190px]"
            title={modalityDirection}
          >
            {modalityDirection}
          </span>
          <span className="text-[var(--sidebar-border)]">•</span>
          <span className="font-semibold text-emerald-600 dark:text-emerald-400">
            {pricingInfo.primary}
          </span>
        </div>

        {/* Description snippet */}
        {model.description && (
          <p
            className="text-xs text-[var(--sidebar-muted-fg)] line-clamp-2 mb-3 leading-relaxed opacity-85"
            title={model.description}
          >
            {model.description}
          </p>
        )}
      </div>

      {/* Parameter pills & Details footer */}
      <div className="pt-2 border-t mt-auto flex items-center justify-between gap-2" style={{ borderColor: "color-mix(in srgb, var(--modal-border) 60%, transparent)" }}>
        <div className="flex flex-wrap items-center gap-1 min-w-0">
          {parameters.length > 0 ? (
            parameters.map((param) => (
              <span
                key={param}
                className="text-[10px] font-medium px-1.5 py-0.5 rounded"
                style={{
                  background: "color-mix(in srgb, var(--modal-fg) 5%, transparent)",
                  color: "var(--sidebar-muted-fg)",
                }}
              >
                {param}
              </span>
            ))
          ) : (
            <span className="text-[10px] text-[var(--sidebar-muted-fg)] opacity-70">
              Standard API parameters
            </span>
          )}
        </div>

        <span className="shrink-0 text-[11px] font-semibold text-[color:var(--chat-accent)] group-hover:underline">
          Specs →
        </span>
      </div>
    </div>
  );
});
