import { act, renderHook } from "@testing-library/react";
import { useModelSelection } from "../useModelSelection";
import { Model } from "@/app/components/model-interface/shared/types";

const makeModel = (id: string, main?: boolean): Model => ({
  id,
  name: id,
  description: "",
  context_length: 8192,
  main,
});

describe("useModelSelection catalog ordering", () => {
  const models = [
    makeModel("main-a", true),
    makeModel("main-b", true),
    makeModel("other-a", false),
    makeModel("other-b"),
    makeModel("ollama:llama", false),
  ];

  it("lists default quick picks before other models on the unified catalog", () => {
    const catalog: Model[] = [
      { ...makeModel("openrouter/free"), featured: true },
      { ...makeModel("openai/gpt-4o"), featured: true },
      makeModel("custom/model"),
    ];

    const { result } = renderHook(() =>
      useModelSelection({
        models: catalog,
        pinnedModelIds: [],
      }),
    );

    expect(result.current.quickPickModelsSorted.map((m) => m.id)).toEqual([
      "openrouter/free",
      "openai/gpt-4o",
    ]);
    expect(result.current.otherModelsSorted.map((m) => m.id)).toEqual([
      "custom/model",
    ]);
  });

  it("filters to default models when catalog filter is default", () => {
    const catalog: Model[] = [
      { ...makeModel("openrouter/free"), featured: true },
      makeModel("custom/model"),
    ];

    const { result } = renderHook(() =>
      useModelSelection({
        models: catalog,
        pinnedModelIds: [],
      }),
    );

    act(() => {
      result.current.setCatalogFilter("default");
    });

    expect(result.current.quickPickModelsSorted).toEqual([]);
    expect(result.current.otherModelsSorted.map((m) => m.id)).toEqual([
      "openrouter/free",
    ]);
  });

  it("filters to ollama models when catalog filter is ollama", () => {
    const { result } = renderHook(() =>
      useModelSelection({
        models,
        pinnedModelIds: [],
      }),
    );

    act(() => {
      result.current.setCatalogFilter("ollama");
    });

    expect(result.current.quickPickModelsSorted).toEqual([]);
    expect(result.current.otherModelsSorted.map((m) => m.id)).toEqual([
      "ollama:llama",
    ]);
  });

  it("uses flat sort order when search is active instead of quick picks first", () => {
    const catalog: Model[] = [
      { ...makeModel("openrouter/free"), featured: true },
      { ...makeModel("openai/gpt-4o"), featured: true },
      makeModel("custom/model"),
    ];

    const { result } = renderHook(() =>
      useModelSelection({
        models: catalog,
        pinnedModelIds: [],
        search: "custom",
      }),
    );

    expect(result.current.quickPickModelsSorted).toEqual([]);
    expect(result.current.otherModelsSorted.map((m) => m.id)).toEqual([
      "custom/model",
    ]);
  });

  it("uses flat sort order when a sidebar filter is active", () => {
    const catalog: Model[] = [
      { ...makeModel("openrouter/free"), featured: true },
      makeModel("openai/custom"),
    ];

    const { result } = renderHook(() =>
      useModelSelection({
        models: catalog,
        pinnedModelIds: [],
        selectedProviders: ["openai"],
      }),
    );

    expect(result.current.quickPickModelsSorted).toEqual([]);
    expect(result.current.otherModelsSorted.map((m) => m.id)).toEqual([
      "openai/custom",
    ]);
  });
});
