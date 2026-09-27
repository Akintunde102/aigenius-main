import {
  computeModelRequiredBalance,
  computeCreditsShortfall,
  getModelCreditBurnPercentage,
  getModelCreditBurnWarning,
  getModelWalletLockShortHint,
  isHighCreditBurnModel,
  isModelPickLocked,
  partitionModelsByWalletAffordance,
} from "../modelWalletAffordance.utils";
import type { Model } from "@/app/components/model-interface/shared/types";

jest.mock("@/lib/e2e-wallet-bypass", () => ({
  isE2eBrowserWalletBypassEnabled: jest.fn(() => false),
}));

const model: Model = {
  id: "openai/gpt-4o",
  name: "GPT-4o",
  description: "Test model",
  context_length: 128_000,
};

describe("modelWalletAffordance.utils", () => {
  it("requires at least the global minimum when model cost is unknown", () => {
    expect(computeModelRequiredBalance(model, 0)).toBe(5);
  });

  it("requires 2× average message cost in credits", () => {
    // 0.01 USD/msg × 1000 credits/USD × 2 = 20 credits
    expect(computeModelRequiredBalance(model, 0.01)).toBe(20);
  });

  it("locks picks when wallet is below required balance", () => {
    expect(
      isModelPickLocked(10, 20, { modelId: model.id }),
    ).toBe(true);
  });

  it("does not lock the already-selected model", () => {
    expect(
      isModelPickLocked(10, 20, {
        modelId: model.id,
        selectedModelId: model.id,
      }),
    ).toBe(false);
  });

  it("does not lock while wallet is still loading", () => {
    expect(isModelPickLocked(null, 20, { modelId: model.id })).toBe(false);
  });

  it("builds a short inline hint with credits still needed", () => {
    expect(getModelWalletLockShortHint(100, 36)).toBe(
      "Load 64 more credits to use",
    );
    expect(getModelWalletLockShortHint(19.2, 0)).toBe(
      "Load 20 more credits to use",
    );
  });

  it("computes credit shortfall from wallet balance", () => {
    expect(computeCreditsShortfall(36, 100)).toBe(64);
    expect(computeCreditsShortfall(null, 50)).toBe(50);
  });

  it("partitions models into affordable and locked buckets", () => {
    const cheap: Model = { ...model, id: "cheap", name: "Cheap" };
    const expensive: Model = { ...model, id: "expensive", name: "Expensive" };
    const avgCostById = new Map<string, number>([
      [cheap.id, 0.001],
      [expensive.id, 0.05],
    ]);

    const { affordable, locked } = partitionModelsByWalletAffordance(
      [cheap, expensive],
      10,
      avgCostById,
    );

    expect(affordable.map((m) => m.id)).toEqual([cheap.id]);
    expect(locked.map((m) => m.id)).toEqual([expensive.id]);
  });

  describe("credit burn calculations", () => {
    it("returns null when wallet is null, undefined, or non-positive", () => {
      expect(getModelCreditBurnPercentage(model, null, 0.01)).toBeNull();
      expect(getModelCreditBurnPercentage(model, undefined, 0.01)).toBeNull();
      expect(getModelCreditBurnPercentage(model, 0, 0.01)).toBeNull();
      expect(getModelCreditBurnPercentage(model, -5, 0.01)).toBeNull();
    });

    it("returns null when model cost is 0 or negative", () => {
      expect(getModelCreditBurnPercentage(model, 100, 0)).toBeNull();
    });

    it("calculates the correct burn percentage relative to wallet", () => {
      // 0.07 USD * 1000 credits/USD = 70 credits.
      // 70 credits / 100 credits in wallet = 70%
      expect(getModelCreditBurnPercentage(model, 100, 0.07)).toBe(70);

      // 0.035 USD * 1000 credits/USD = 35 credits.
      // 35 credits / 50 credits in wallet = 70%
      expect(getModelCreditBurnPercentage(model, 50, 0.035)).toBe(70);

      // 0.01 USD * 1000 = 10 credits.
      // 10 / 100 = 10%
      expect(getModelCreditBurnPercentage(model, 100, 0.01)).toBe(10);
    });

    it("flags models that burn 60% or more of wallet", () => {
      expect(isHighCreditBurnModel(model, 100, 0.06)).toBe(true);
      expect(isHighCreditBurnModel(model, 100, 0.085)).toBe(true);
      expect(isHighCreditBurnModel(model, 100, 0.059)).toBe(false);
      expect(isHighCreditBurnModel(model, null, 0.06)).toBe(false);
    });

    it("formats a user-friendly warning message", () => {
      expect(getModelCreditBurnWarning(60)).toBe("Burns ~60% of credits");
      expect(getModelCreditBurnWarning(85)).toBe("Burns ~85% of credits");
    });
  });
});

