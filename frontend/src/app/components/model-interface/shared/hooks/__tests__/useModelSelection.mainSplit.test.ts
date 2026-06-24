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

describe("useModelSelection main split", () => {
  const models = [
    makeModel("main-a", true),
    makeModel("main-b", true),
    makeModel("other-a", false),
    makeModel("other-b"),
  ];

  it("splits All Models tab into main and other lists", () => {
    const { result } = renderHook(() =>
      useModelSelection({
        models,
        pinnedModelIds: [],
      }),
    );

    act(() => {
      result.current.setActiveTab("all");
    });

    expect(result.current.mainModelsSorted.map((m) => m.id)).toEqual([
      "main-a",
      "main-b",
    ]);
    expect(result.current.otherModelsSorted.map((m) => m.id)).toEqual([
      "other-a",
      "other-b",
    ]);
  });
});
