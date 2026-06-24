import { filterModelsNew, sortModelsNew } from "../utils";
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
const webSearchModel = makeModel({
  id: "perplexity/sonar-small",
  name: "Sonar Small",
  pricing: {
    web_search: "0.005",
  },
});

const allModels = [modelA, modelB, visionModel, webSearchModel];

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

  it("should filter for image support", () => {
    const result = filterModelsNew(allModels, "", [], true);
    expect(result.length).toBe(1);
    expect(result[0].id).toBe(visionModel.id);
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
