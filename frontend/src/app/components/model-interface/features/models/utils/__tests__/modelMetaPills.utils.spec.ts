import { Model } from "@/app/components/model-interface/shared/types";
import { buildModelCardSlots, buildModelMetaPills } from "../modelMetaPills.utils";

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
  it("builds release, cost, and modality pills without descriptions, lab, or context", () => {
    const pills = buildModelMetaPills(baseModel, 23);

    const labels = pills.map((pill) => pill.label);

    expect(labels).not.toContain("Google");
    expect(labels).not.toContain("1M ctx");
    expect(labels.some((label) => /credits\/msg$/.test(label))).toBe(true);
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
        id: "",
        name: "Custom",
        description: "",
        context_length: 0,
      },
      Number.NaN,
    );

    expect(pills).toEqual([]);
  });
});

describe("buildModelCardSlots", () => {
  it("places provider, cost, release, and supporting meta in separate slots", () => {
    const slots = buildModelCardSlots(baseModel, 23);

    expect(slots.provider).toBe("Google");
    expect(slots.cost?.isPaid).toBe(true);
    expect(slots.cost?.label).toMatch(/\/ msg$/);
    expect(slots.release).toMatch(/2024/);
    expect(slots.supporting.map((item) => item.label)).toEqual(
      expect.arrayContaining(["Image"]),
    );
    expect(slots.supporting.some((item) => item.key === "context")).toBe(false);
  });

  it("omits provider and cost when they are not usable", () => {
    const slots = buildModelCardSlots(
      {
        id: "",
        name: "Custom",
        description: "",
        context_length: 0,
      },
      Number.NaN,
    );

    expect(slots.provider).toBeUndefined();
    expect(slots.cost).toBeUndefined();
    expect(slots.release).toBeUndefined();
    expect(slots.supporting).toEqual([]);
  });

  it("marks zero-cost models as Free without a paid tone", () => {
    const slots = buildModelCardSlots(
      { ...baseModel, id: "openrouter/free", name: "Free" },
      0,
    );

    expect(slots.provider).toBeUndefined();
    expect(slots.cost).toEqual({ label: "Free", isPaid: false });
  });
});
