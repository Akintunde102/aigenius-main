import { sortModelsNew } from "../utils";
import type { Model } from "../../types";

// Minimal Model factory – merges defaults with overrides to avoid duplicate-key TS errors
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
  };
  return { ...defaults, ...overrides } as unknown as Model;
}

const featuredA = makeModel({
  id: "openai/gpt-4o",
  name: "GPT-4o",
  featured: true,
});
const featuredB = makeModel({
  id: "anthropic/claude",
  name: "Claude",
  featured: true,
});
const regularA = makeModel({
  id: "meta/llama",
  name: "Llama",
  featured: false,
});
const regularB = makeModel({
  id: "mistral/7b",
  name: "Mistral 7B",
  featured: false,
});

describe("sortModelsNew", () => {
  describe('orderBy = "default"', () => {
    it("should put featured models first, then regular models", () => {
      const input = [regularA, featuredA, regularB, featuredB];
      const result = sortModelsNew(input, "default", "asc");

      // First two should all be featured
      expect(result[0].featured).toBe(true);
      expect(result[1].featured).toBe(true);
      // Last two should be non-featured
      expect(result[2].featured).not.toBe(true);
      expect(result[3].featured).not.toBe(true);
    });

    it("should preserve relative order within featured and non-featured groups", () => {
      const input = [regularA, featuredA, regularB, featuredB];
      const result = sortModelsNew(input, "default", "asc");

      // Featured group should be [featuredA, featuredB] in original relative order
      expect(result[0].id).toBe(featuredA.id);
      expect(result[1].id).toBe(featuredB.id);
      // Non-featured group should be [regularA, regularB] in original relative order
      expect(result[2].id).toBe(regularA.id);
      expect(result[3].id).toBe(regularB.id);
    });

    it("should return all models when there are no featured models", () => {
      const input = [regularA, regularB];
      const result = sortModelsNew(input, "default", "asc");
      expect(result).toEqual(input);
    });

    it("should return all models when all are featured", () => {
      const input = [featuredA, featuredB];
      const result = sortModelsNew(input, "default", "asc");
      expect(result).toEqual(input);
    });

    it("should not mutate the original array", () => {
      const input = [regularA, featuredA];
      const inputIds = input.map((m) => m.id);
      sortModelsNew(input, "default", "asc");
      // original order unchanged
      expect(input.map((m) => m.id)).toEqual(inputIds);
    });

    it("should handle an empty array", () => {
      const result = sortModelsNew([], "default", "asc");
      expect(result).toEqual([]);
    });
  });

  describe('orderBy = "name"', () => {
    it("should sort by name ascending", () => {
      const input = [regularA, featuredA, featuredB, regularB];
      const result = sortModelsNew(input, "name", "asc");
      const names = result.map((m) => m.name);
      // Names should be alphabetically ascending
      for (let i = 0; i < names.length - 1; i++) {
        expect(names[i].localeCompare(names[i + 1])).toBeLessThanOrEqual(0);
      }
    });

    it("should sort by name descending", () => {
      const input = [featuredA, regularA, featuredB, regularB];
      const result = sortModelsNew(input, "name", "desc");
      const names = result.map((m) => m.name);
      // Names should be alphabetically descending
      for (let i = 0; i < names.length - 1; i++) {
        expect(names[i].localeCompare(names[i + 1])).toBeGreaterThanOrEqual(0);
      }
    });

    it("should NOT put featured models first when a real sort is applied", () => {
      // When user picks a named sort, featured status should not affect ordering
      const input = [featuredA, regularA, featuredB, regularB];
      const result = sortModelsNew(input, "name", "asc");
      // "Claude" < "GPT-4o" < "Llama" < "Mistral 7B"
      expect(result[0].id).toBe(featuredB.id); // Claude
      expect(result[1].id).toBe(featuredA.id); // GPT-4o
    });
  });

  describe('orderBy = "cost"', () => {
    const cheap = makeModel({
      id: "cheap/model",
      name: "Cheap",
      pricing: { prompt: "0.0000001", completion: "0.0000002" },
    });
    const expensive = makeModel({
      id: "exp/model",
      name: "Expensive",
      pricing: { prompt: "0.001", completion: "0.002" },
    });

    it("should sort by cost ascending (cheapest first)", () => {
      const result = sortModelsNew([expensive, cheap], "cost", "asc");
      expect(result[0].id).toBe(cheap.id);
      expect(result[1].id).toBe(expensive.id);
    });

    it("should sort by cost descending (most expensive first)", () => {
      const result = sortModelsNew([cheap, expensive], "cost", "desc");
      expect(result[0].id).toBe(expensive.id);
      expect(result[1].id).toBe(cheap.id);
    });
  });

  describe('orderBy = "context"', () => {
    it("should sort by context length ascending (smallest first)", () => {
      const small = makeModel({
        id: "small",
        name: "Small",
        context_length: 4096,
      });
      const large = makeModel({
        id: "large",
        name: "Large",
        context_length: 128000,
      });
      const result = sortModelsNew([large, small], "context", "asc");
      expect(result[0].id).toBe(small.id);
      expect(result[1].id).toBe(large.id);
    });

    it("should sort by context length descending (largest first)", () => {
      const small = makeModel({
        id: "small",
        name: "Small",
        context_length: 4096,
      });
      const large = makeModel({
        id: "large",
        name: "Large",
        context_length: 128000,
      });
      const result = sortModelsNew([small, large], "context", "desc");
      expect(result[0].id).toBe(large.id);
      expect(result[1].id).toBe(small.id);
    });
  });

  describe('orderBy = "provider"', () => {
    it("should sort by provider label ascending", () => {
      // openai/gpt-4o → provider "openai", anthropic/claude → provider "anthropic"
      const result = sortModelsNew([featuredA, featuredB], "provider", "asc");
      // "Anthropic" < "OpenAI"
      expect(result[0].id).toBe(featuredB.id); // anthropic/claude
      expect(result[1].id).toBe(featuredA.id); // openai/gpt-4o
    });
  });
});
