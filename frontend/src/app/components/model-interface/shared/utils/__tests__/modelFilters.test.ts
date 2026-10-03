import {
  filterModelsNew,
  sortModelsNew,
  buildLabFilterOptions,
  getProvider,
  getProviderLabel,
} from "../utils";
import type { Model } from "../../types";

function makeModel(
  overrides: Partial<Model> & { id: string; name: string },
): Model {
  const defaults = {
    featured: false,
    context_length: 4096,
    architecture: {
      input_modalities: ["text"],
      output_modalities: ["text"],
    },
    pricing: { prompt: "0.000001", completion: "0.000002" },
    description: "",
    subtitle: "",
  };
  return { ...defaults, ...overrides } as unknown as Model;
}

const modelA = makeModel({
  id: "openai/gpt-4o",
  name: "GPT-4o",
  description: "Advanced language model",
});
const modelB = makeModel({
  id: "anthropic/claude-3-sonnet",
  name: "Claude 3 Sonnet",
  subtitle: "Efficient and smart",
});
const visionModel = makeModel({
  id: "google/gemini-pro-vision",
  name: "Gemini Pro Vision",
  architecture: {
    input_modalities: ["text", "image"],
    output_modalities: ["text", "image"],
  },
});
const imageOutputOnlyModel = makeModel({
  id: "stability/sdxl",
  name: "SDXL",
  architecture: {
    input_modalities: ["text"],
    output_modalities: ["text", "image"],
  },
});
const fileInputModel = makeModel({
  id: "google/gemini-file-input",
  name: "Gemini File Input",
  architecture: {
    input_modalities: ["text", "file"],
    output_modalities: ["text"],
  },
});
const webSearchModel = makeModel({
  id: "perplexity/sonar-small",
  name: "Sonar Small",
  pricing: {
    web_search: "0.005",
  },
});

const allModels = [modelA, modelB, visionModel, imageOutputOnlyModel, fileInputModel, webSearchModel];

describe("filterModelsNew", () => {
  it("should return all models when search and filters are empty", () => {
    const result = filterModelsNew(allModels, "", []);
    expect(result).toEqual(allModels);
  });

  it("should filter by search term in name", () => {
    const result = filterModelsNew(allModels, "gpt", []);
    expect(result.length).toBe(1);
    expect(result[0].id).toBe(modelA.id);
  });

  it("should filter by search term in description", () => {
    const result = filterModelsNew(allModels, "advanced", []);
    expect(result).toContain(modelA);
  });

  it("should filter by search term in subtitle", () => {
    const result = filterModelsNew(allModels, "efficient", []);
    expect(result).toContain(modelB);
  });

  it("should filter by provider", () => {
    const result = filterModelsNew(allModels, "", ["openai"]);
    expect(result.length).toBe(1);
    expect(result[0].id).toBe(modelA.id);
  });

  it("should filter by multiple providers", () => {
    const result = filterModelsNew(allModels, "", ["openai", "anthropic"]);
    expect(result.length).toBe(2);
    expect(result.some(m => m.id === modelA.id)).toBe(true);
    expect(result.some(m => m.id === modelB.id)).toBe(true);
  });

  it("should filter for file or image input support", () => {
    const result = filterModelsNew(allModels, "", [], true);
    expect(result.map((m) => m.id).sort()).toEqual(
      [fileInputModel.id, visionModel.id].sort(),
    );
    expect(result.some((m) => m.id === imageOutputOnlyModel.id)).toBe(false);
  });

  it("should filter for web search capability", () => {
    const result = filterModelsNew(allModels, "", [], false, true);
    expect(result.length).toBe(1);
    expect(result[0].id).toBe(webSearchModel.id);
  });

  it("should combine multiple filters", () => {
    // Search for "sonar" with web search enabled
    const result = filterModelsNew(allModels, "sonar", [], false, true);
    expect(result.length).toBe(1);
    expect(result[0].id).toBe(webSearchModel.id);

    // Search for "gpt" but with image filter enabled
    const noResult = filterModelsNew(allModels, "gpt", [], true);
    expect(noResult.length).toBe(0);
  });

  it("should handle token-based matching (space vs hyphen)", () => {
    const result = filterModelsNew(allModels, "claude 3", []);
    expect(result.length).toBe(1);
    expect(result[0].id).toBe(modelB.id);
  });

  it("should rank by relevance", () => {
    const models = [
      makeModel({ id: "1", name: "Some Model", description: "This is a gpt based model" }),
      makeModel({ id: "2", name: "GPT-4", description: "Latest model" }),
    ];
    
    const filtered = filterModelsNew(models, "gpt", []);
    const sorted = sortModelsNew(filtered, "default", "asc");
    
    expect(sorted[0].name).toBe("GPT-4");
  });
});

describe("buildLabFilterOptions", () => {
  it("precomputes lab options with counts in brackets", () => {
    const testModels = [
      makeModel({ id: "openai/gpt-4o", name: "GPT-4o" }),
      makeModel({ id: "openai/gpt-4o-mini", name: "GPT-4o Mini" }),
      makeModel({ id: "anthropic/claude-3-5-sonnet", name: "Claude 3.5 Sonnet" }),
      makeModel({ id: "mistralai/mistral-large", name: "Mistral Large" }),
      makeModel({ id: "ollama:llama3", name: "Llama 3" }),
    ];

    const options = buildLabFilterOptions(testModels);

    // First option should be "All labs" with total count in bracket
    expect(options[0]).toEqual({ value: "", label: "All labs (5)" });

    // Major providers should be presented first, then others alphabetically
    const optionValues = options.map((o) => o.value);
    expect(optionValues).toContain("openai");
    expect(optionValues).toContain("anthropic");
    expect(optionValues).toContain("mistralai");
    expect(optionValues).toContain("ollama");

    // Formatted labels with counts in brackets
    expect(options.find((o) => o.value === "openai")?.label).toBe("OpenAI (2)");
    expect(options.find((o) => o.value === "anthropic")?.label).toBe("Anthropic (1)");
    expect(options.find((o) => o.value === "mistralai")?.label).toBe("Mistral (1)");
    expect(options.find((o) => o.value === "ollama")?.label).toBe("Ollama (1)");
  });

  it("falls back to precomputed catalog counts when models array is empty", () => {
    const options = buildLabFilterOptions([]);
    expect(options.length).toBeGreaterThan(1);
    expect(options[0].label).toMatch(/^All labs \(\d+\)$/);
    expect(options.some((o) => o.value === "openai" && o.label.includes("OpenAI"))).toBe(true);
  });

  it("handles ollama provider prefix in getProvider", () => {
    expect(getProvider("ollama:llama3")).toBe("ollama");
    expect(getProvider("ollama/mistral")).toBe("ollama");
    expect(getProvider("openai/gpt-4o")).toBe("openai");
  });

  it("returns human-readable labels for known labs", () => {
    expect(getProviderLabel("openai")).toBe("OpenAI");
    expect(getProviderLabel("x-ai")).toBe("xAI");
    expect(getProviderLabel("z-ai")).toBe("Z-AI");
    expect(getProviderLabel("meta-llama")).toBe("Meta Llama");
    expect(getProviderLabel("bytedance-seed")).toBe("ByteDance Seed");
    expect(getProviderLabel("~openai")).toBe("OpenAI (Latest)");
  });
});
