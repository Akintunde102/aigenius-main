import type { Model } from "@/app/components/model-interface/shared/types";
import {
  catalogModalityFromModel,
  filterConversationPickableModelIds,
  filterModelsForChatUiCatalog,
  isConversationPickableModel,
} from "../modelConversationEligibility.utils";

function model(partial: Partial<Model> & Pick<Model, "id">): Model {
  return {
    name: partial.id,
    description: "",
    context_length: 0,
    ...partial,
  };
}

describe("catalogModalityFromModel", () => {
  it("classifies text chat models as text", () => {
    expect(
      catalogModalityFromModel(
        model({
          id: "openai/gpt-5",
          architecture: { output_modalities: ["text"], input_modalities: ["text", "image"] },
        }),
      ),
    ).toBe("text");
  });

  it("prefers image output over text-input vision", () => {
    expect(
      catalogModalityFromModel(
        model({
          id: "openai/gpt-5-image",
          architecture: { output_modalities: ["text", "image"] },
        }),
      ),
    ).toBe("image");
  });

  it("uses catalog_modality when outputs are missing", () => {
    expect(
      catalogModalityFromModel(
        model({ id: "recraft/recraft-v4", catalog_modality: "image" }),
      ),
    ).toBe("image");
  });
});

describe("isConversationPickableModel", () => {
  it("allows standard text models", () => {
    expect(
      isConversationPickableModel(
        model({ id: "anthropic/claude-sonnet-5", architecture: { output_modalities: ["text"] } }),
      ),
    ).toBe(true);
  });

  it("rejects image-generation catalog models", () => {
    expect(
      isConversationPickableModel(
        model({
          id: "black-forest-labs/flux-2-pro",
          catalog_modality: "image",
          architecture: { output_modalities: ["image"] },
        }),
      ),
    ).toBe(false);
  });

  it("rejects OpenRouter router models", () => {
    expect(
      isConversationPickableModel(
        model({ id: "openrouter/auto", architecture: { output_modalities: ["text"] } }),
      ),
    ).toBe(false);
  });
});

describe("filterModelsForChatUiCatalog", () => {
  it("removes non-text models from the list shown in chat UI", () => {
    const models = [
      model({ id: "a/text", architecture: { output_modalities: ["text"] } }),
      model({ id: "b/image", architecture: { output_modalities: ["image"] } }),
    ];
    expect(filterModelsForChatUiCatalog(models).map((m) => m.id)).toEqual(["a/text"]);
  });
});

describe("filterConversationPickableModelIds", () => {
  it("drops non-text ids from quick-pick lists", () => {
    const models = [
      model({ id: "a/text", architecture: { output_modalities: ["text"] } }),
      model({ id: "b/image", architecture: { output_modalities: ["image"] } }),
    ];
    expect(
      filterConversationPickableModelIds(models, ["a/text", "b/image", "missing"]),
    ).toEqual(["a/text"]);
  });
});
