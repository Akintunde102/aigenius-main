import type { Model } from "@/app/components/model-interface/shared/types";
import {
  isNonTextModel,
  filterNonTextModels,
} from "../modelConversationEligibility.utils";
import {
  getNonTextModalityCategory,
  getModalityCategoryLabel,
  formatModalitiesDirection,
  formatNonTextPricing,
  getHighlightedParameters,
} from "../nonTextModelFormatting.utils";

describe("Non-Text Model Eligibility & Formatting Utils", () => {
  const sampleImageModel: Model = {
    id: "black-forest-labs/flux.2-pro",
    name: "FLUX.2 Pro",
    provider: "black-forest-labs",
    description: "High quality image generation model",
    context_length: 46864,
    architecture: {
      modality: "text+image->image",
      input_modalities: ["text", "image"],
      output_modalities: ["image"],
    },
    pricing: {
      image_output: "0.00000732421875",
    },
    averageUserSpendPerRequest: {
      promptCost: 0,
      completionCost: 0,
      expectedImageCost: 0.045,
      totalAverageCost: 0.045,
      totalAverageCostCredits: 45,
      averageUnit: "megapixel",
    },
    supported_parameters: ["seed", "aspect_ratio", "quality"],
  } as any;

  const sampleVideoModel: Model = {
    id: "bytedance/seedance-2.0",
    name: "Seedance 2.0",
    provider: "bytedance",
    description: "Frontier video synthesis model",
    context_length: 0,
    architecture: {
      modality: "text+image+audio+video->video",
      input_modalities: ["text", "image", "audio", "video"],
      output_modalities: ["video"],
    },
    pricing: {
      prompt: "0",
      completion: "0",
    },
    averageUserSpendPerRequest: {
      promptCost: 0,
      completionCost: 0,
      expectedImageCost: 0.3,
      totalAverageCost: 0.3,
      totalAverageCostCredits: 300,
      averageUnit: "5s video",
    },
    supported_parameters: ["duration", "fps", "camera_motion"],
  } as any;

  const sampleSpeechModel: Model = {
    id: "deepgram/aura-2",
    name: "Deepgram Aura 2",
    provider: "deepgram",
    description: "Low-latency voice synthesis",
    context_length: 0,
    architecture: {
      input_modalities: ["text"],
      output_modalities: ["speech"],
    },
    pricing: {
      audio_output: "0.015",
    },
    averageUserSpendPerRequest: {
      promptCost: 0,
      completionCost: 0,
      expectedImageCost: 0.0225,
      totalAverageCost: 0.0225,
      totalAverageCostCredits: 23,
      averageUnit: "audio",
    },
    supported_parameters: ["voice"],
  } as any;

  const sampleTranscriptionModel: Model = {
    id: "deepgram/nova-3",
    name: "Deepgram Nova 3",
    provider: "deepgram",
    description: "Speech to text model",
    context_length: 0,
    architecture: {
      input_modalities: ["audio"],
      output_modalities: ["transcription"],
    },
    pricing: {},
    supported_parameters: ["timestamps", "diarization"],
  } as any;

  const sampleChatModel: Model = {
    id: "anthropic/claude-3.5-sonnet",
    name: "Claude 3.5 Sonnet",
    provider: "anthropic",
    description: "Text reasoning model",
    context_length: 200000,
    architecture: {
      input_modalities: ["text", "image"],
      output_modalities: ["text"],
    },
    pricing: {
      prompt: "0.000003",
      completion: "0.000015",
    },
  } as any;

  describe("isNonTextModel & filterNonTextModels", () => {
    it("identifies non-text models accurately", () => {
      expect(isNonTextModel(sampleImageModel)).toBe(true);
      expect(isNonTextModel(sampleVideoModel)).toBe(true);
      expect(isNonTextModel(sampleSpeechModel)).toBe(true);
      expect(isNonTextModel(sampleTranscriptionModel)).toBe(true);
      expect(isNonTextModel(sampleChatModel)).toBe(false);
      expect(isNonTextModel(null)).toBe(false);
      expect(isNonTextModel(undefined)).toBe(false);
    });

    it("filters a mixed list to only non-text models", () => {
      const all = [
        sampleImageModel,
        sampleChatModel,
        sampleVideoModel,
        sampleSpeechModel,
        sampleTranscriptionModel,
      ];
      const filtered = filterNonTextModels(all);
      expect(filtered.length).toBe(4);
      expect(filtered.map((m) => m.id)).toEqual([
        sampleImageModel.id,
        sampleVideoModel.id,
        sampleSpeechModel.id,
        sampleTranscriptionModel.id,
      ]);
    });
  });

  describe("getNonTextModalityCategory & getModalityCategoryLabel", () => {
    it("returns correct category for each non-text model", () => {
      expect(getNonTextModalityCategory(sampleImageModel)).toBe("image");
      expect(getNonTextModalityCategory(sampleVideoModel)).toBe("video");
      expect(getNonTextModalityCategory(sampleSpeechModel)).toBe("speech");
      expect(getNonTextModalityCategory(sampleTranscriptionModel)).toBe("transcription");
    });

    it("returns human-friendly labels", () => {
      expect(getModalityCategoryLabel("image")).toBe("Image Generation");
      expect(getModalityCategoryLabel("video")).toBe("Video Generation");
      expect(getModalityCategoryLabel("speech")).toBe("Voice & Speech");
      expect(getModalityCategoryLabel("transcription")).toBe("Transcription");
      expect(getModalityCategoryLabel("all")).toBe("All Media");
    });
  });

  describe("formatModalitiesDirection", () => {
    it("formats input and output modalities correctly", () => {
      expect(formatModalitiesDirection(sampleImageModel)).toBe("Text + Image → Image");
      expect(formatModalitiesDirection(sampleVideoModel)).toBe("Text + Image + Audio + Video → Video");
      expect(formatModalitiesDirection(sampleSpeechModel)).toBe("Text → Speech");
      expect(formatModalitiesDirection(sampleTranscriptionModel)).toBe("Audio → Transcription");
    });
  });

  describe("formatNonTextPricing", () => {
    it("shows average credits for image, video, and audio models", () => {
      expect(formatNonTextPricing(sampleImageModel).primary).toBe("~45 credits / megapixel");
      expect(formatNonTextPricing(sampleVideoModel).primary).toBe("~300 credits / 5s video");
      expect(formatNonTextPricing(sampleSpeechModel).primary).toBe("~23 credits / audio");
    });

    it("does not label priced media models as free when the average is missing", () => {
      const unpriced = {
        ...sampleVideoModel,
        averageUserSpendPerRequest: undefined,
        pricing: { prompt: "0", completion: "0" },
      } as any;
      expect(formatNonTextPricing(unpriced).primary).toBe("Pricing on request");
      expect(formatNonTextPricing(unpriced).primary).not.toContain("$");
    });

    it("identifies listed free models", () => {
      const freeModel = {
        ...sampleImageModel,
        id: "openrouter/free",
        name: "Free",
        averageUserSpendPerRequest: undefined,
        pricing: { prompt: "0", completion: "0" },
      } as any;
      expect(formatNonTextPricing(freeModel).primary).toBe("Free");
    });
  });

  describe("getHighlightedParameters", () => {
    it("converts raw parameter keys to clean tags", () => {
      const imageParams = getHighlightedParameters(sampleImageModel);
      expect(imageParams).toContain("Seed Control");
      expect(imageParams).toContain("Aspect Ratio");
      expect(imageParams).toContain("Quality Presets");

      const videoParams = getHighlightedParameters(sampleVideoModel);
      expect(videoParams).toContain("Duration");
      expect(videoParams).toContain("FPS");
      expect(videoParams).toContain("Camera Control");

      const transcriptionParams = getHighlightedParameters(sampleTranscriptionModel);
      expect(transcriptionParams).toContain("Word Timestamps");
      expect(transcriptionParams).toContain("Speaker Diarization");
    });
  });
});
