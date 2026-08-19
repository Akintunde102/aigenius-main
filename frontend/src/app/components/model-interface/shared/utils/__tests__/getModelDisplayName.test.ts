import { getModelDisplayName, stripLabPrefixFromModelName } from "../utils";
import type { Model } from "../../types";

function model(id: string, name: string): Model {
  return { id, name, description: "", context_length: 8192 };
}

describe("stripLabPrefixFromModelName", () => {
  it("strips an OpenRouter lab prefix that matches the model id", () => {
    expect(stripLabPrefixFromModelName("Google: Gemini 3 Flash", "google/gemini-3-flash")).toBe(
      "Gemini 3 Flash",
    );
    expect(stripLabPrefixFromModelName("OpenAI: GPT-5.6 Sol", "openai/gpt-5.6-sol")).toBe(
      "GPT-5.6 Sol",
    );
  });

  it("strips lab aliases that differ from the raw provider slug", () => {
    expect(stripLabPrefixFromModelName("Meta: Llama 3.3 70B Instruct", "meta-llama/llama-3.3-70b-instruct")).toBe(
      "Llama 3.3 70B Instruct",
    );
    expect(stripLabPrefixFromModelName("Nous: Hermes 4 405B", "nousresearch/hermes-4-405b")).toBe(
      "Hermes 4 405B",
    );
    expect(stripLabPrefixFromModelName("xAI: Grok 4", "x-ai/grok-4")).toBe("Grok 4");
    expect(stripLabPrefixFromModelName("Z.ai: GLM 5.2", "z-ai/glm-5.2")).toBe("GLM 5.2");
  });

  it("leaves names unchanged when there is no matching lab prefix", () => {
    expect(stripLabPrefixFromModelName("GPT-4o", "openai/gpt-4o")).toBe("GPT-4o");
    expect(stripLabPrefixFromModelName("Preview: experimental", "openai/gpt-4o")).toBe(
      "Preview: experimental",
    );
  });
});

describe("getModelDisplayName", () => {
  it("returns the name without the lab prefix", () => {
    expect(getModelDisplayName(model("google/gemini-3-flash", "Google: Gemini 3 Flash"))).toBe(
      "Gemini 3 Flash",
    );
  });

  it("keeps the Free alias for the platform free model", () => {
    expect(getModelDisplayName(model("openrouter/free", "OpenRouter: Free"))).toBe("Free");
  });
});
