import type { Model } from "@/app/components/model-interface/shared/types";
import {
  PREFERRED_QUICK_PICK_MODEL_IDS,
  resolveDefaultQuickPickModelIds,
  resolveQuickPickModelIdsForDisplay,
  mergeQuickPickIdsForDisplay,
  mergeDefaultsWithSavedQuickPicks,
  shouldMigrateLegacyFavoritesToQuickPicks,
  mapQuickPickModels,
  reconcileActiveModelSelection,
  isActiveModelOutsideQuickPicks,
} from "../quickPickModels";

describe("quickPickModels", () => {
  const models: Model[] = [
    { id: "openrouter/free", name: "Free", description: "", context_length: 0 },
    { id: "openai/gpt-5-mini", name: "GPT-5 Mini", description: "", context_length: 0 },
    { id: "anthropic/claude-sonnet-4.5", name: "Sonnet", description: "", context_length: 0 },
    { id: "other/model", name: "Other", description: "", context_length: 0, featured: true },
  ];

  it("resolveDefaultQuickPickModelIds prefers curated order and caps count", () => {
    const ids = resolveDefaultQuickPickModelIds(models);
    expect(ids[0]).toBe("openrouter/free");
    expect(ids).toContain("openai/gpt-5-mini");
    expect(ids).toContain("anthropic/claude-sonnet-4.5");
    expect(ids).toContain("other/model");
    expect(ids.length).toBeLessThanOrEqual(10);
  });

  it("resolveDefaultQuickPickModelIds skips unavailable preferred ids", () => {
    const ids = resolveDefaultQuickPickModelIds([
      { id: "openrouter/free", name: "Free", description: "", context_length: 0 },
    ]);
    expect(ids).toEqual(["openrouter/free"]);
  });

  it("mapQuickPickModels preserves pinned order", () => {
    const mapped = mapQuickPickModels(models, [
      "anthropic/claude-sonnet-4.5",
      "openrouter/free",
    ]);
    expect(mapped.map((m) => m.id)).toEqual([
      "anthropic/claude-sonnet-4.5",
      "openrouter/free",
    ]);
  });

  it("mergeQuickPickIdsForDisplay follows backend when user removed a default", () => {
    const saved = mergeDefaultsWithSavedQuickPicks(models, ["other/model"]);
    const withoutMini = saved.filter((id) => id !== "openai/gpt-5-mini");
    const ids = mergeQuickPickIdsForDisplay(models, withoutMini);
    expect(ids).not.toContain("openai/gpt-5-mini");
    expect(ids).toContain("openrouter/free");
    expect(ids).toContain("other/model");
  });

  it("shouldMigrateLegacyFavoritesToQuickPicks only when no defaults saved", () => {
    expect(shouldMigrateLegacyFavoritesToQuickPicks(models, ["other/model"])).toBe(
      true,
    );
    const withDefault = mergeDefaultsWithSavedQuickPicks(models, ["other/model"]);
    expect(shouldMigrateLegacyFavoritesToQuickPicks(models, withDefault)).toBe(false);
  });

  it("mergeDefaultsWithSavedQuickPicks puts defaults first", () => {
    const ids = mergeDefaultsWithSavedQuickPicks(models, ["other/model"]);
    expect(ids[0]).toBe("openrouter/free");
    expect(ids[ids.length - 1]).toBe("other/model");
  });

  it("resolveQuickPickModelIdsForDisplay shows defaults while loading", () => {
    const ids = resolveQuickPickModelIdsForDisplay(models, [], false);
    expect(ids).toContain("openrouter/free");
  });

  it("resolveQuickPickModelIdsForDisplay uses saved picks from backend", () => {
    const saved = ["openrouter/free", "other/model"];
    const ids = resolveQuickPickModelIdsForDisplay(models, saved, true);
    expect(ids).toEqual(["openrouter/free", "other/model"]);
  });

  it("PREFERRED_QUICK_PICK_MODEL_IDS includes free tier first", () => {
    expect(PREFERRED_QUICK_PICK_MODEL_IDS[0]).toBe("openrouter/free");
  });

  it("reconcileActiveModelSelection keeps valid active model", () => {
    const active = models[3];
    const { model, replacedUnavailable } = reconcileActiveModelSelection(
      models,
      active,
      ["openrouter/free"],
      true,
    );
    expect(replacedUnavailable).toBe(false);
    expect(model?.id).toBe("other/model");
  });

  it("reconcileActiveModelSelection falls back when active model missing from catalog", () => {
    const stale = {
      id: "openai/gpt-3.5-turbo",
      name: "GPT-3.5",
      description: "",
      context_length: 0,
    };
    const { model, replacedUnavailable } = reconcileActiveModelSelection(
      models,
      stale,
      ["openrouter/free", "other/model"],
      true,
    );
    expect(replacedUnavailable).toBe(true);
    expect(model?.id).toBe("openrouter/free");
  });

  it("isActiveModelOutsideQuickPicks detects models not in quick pick ids", () => {
    expect(
      isActiveModelOutsideQuickPicks(models[3], ["openrouter/free"]),
    ).toBe(true);
    expect(
      isActiveModelOutsideQuickPicks(models[0], ["openrouter/free"]),
    ).toBe(false);
  });
});
