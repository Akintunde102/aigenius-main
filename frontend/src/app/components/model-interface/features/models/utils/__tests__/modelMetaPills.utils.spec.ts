import { Model } from "@/app/components/model-interface/shared/types";
import { buildModelMetaPills } from "../modelMetaPills.utils";

const baseModel: Model = {
  id: "google/gemini-3-flash",
  name: "Google: Gemini 3 Flash",
  description: "Long marketing description that should not appear in pills.",
  context_length: 1_048_576,
  created: 1704067200, // 2024-01-01 UTC
  architecture: {
    input_modalities: ["text", "image"],
    output_modalities: ["text"],
  },
};

describe("buildModelMetaPills", () => {
  it("builds lab, release, context, cost, and modality pills without descriptions", () => {
    const pills = buildModelMetaPills(baseModel, 23);

    const labels = pills.map((pill) => pill.label);

    expect(labels).toContain("Google");
    expect(labels).toContain("1M ctx");
    expect(labels).toContain("~23 credits/msg");
    expect(labels).toContain("Image");
    expect(labels.some((label) => label.includes("2024"))).toBe(true);
  });

  it("shows Free cost pill when average cost is zero", () => {
    const pills = buildModelMetaPills(
      { ...baseModel, id: "openrouter/free", name: "Free" },
      0,
    );

    expect(pills.some((pill) => pill.label === "Free")).toBe(true);
    expect(pills.some((pill) => pill.label === "Platform")).toBe(false);
  });

  it("returns no pills when model has no usable metadata", () => {
    const pills = buildModelMetaPills(
      {
        id: "custom/unknown",
        name: "Custom",
        description: "",
        context_length: 0,
      },
      Number.NaN,
    );

    expect(pills).toEqual([]);
  });
});
