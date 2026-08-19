import React from "react";
import { render, screen } from "@testing-library/react";
import ModelSelectionFeaturedCard from "../ModelSelectionFeaturedCard";
import { Model } from "@/app/components/model-interface/shared/types";
import "@testing-library/jest-dom";

const model: Model = {
  id: "google/gemini-3-flash",
  name: "Google: Gemini 3 Flash",
  description: "Long marketing description",
  context_length: 1_048_576,
  created: 1704067200,
  supports_tools: true,
  architecture: {
    input_modalities: ["text", "image"],
    output_modalities: ["text"],
  },
};

describe("ModelSelectionFeaturedCard layout", () => {
  it("renders a sidebar-style title with muted cost subtext", () => {
    const { container } = render(
      <ModelSelectionFeaturedCard
        model={model}
        isPinned={false}
        onTogglePin={jest.fn()}
        onSelect={jest.fn()}
        averageCost={23}
        isSelected={false}
        onShowDetails={jest.fn()}
        isSortingByReleaseDate
      />,
    );

    expect(container.querySelector(".app-model-card__title")).toHaveTextContent("Gemini 3 Flash");
    expect(container.querySelector(".app-model-card__cost")).toHaveTextContent("/ msg");
    expect(container.querySelector(".app-model-card__tools-hint")).toBeInTheDocument();
    expect(container.querySelector(".app-model-card__date")).not.toBeInTheDocument();
    expect(container.querySelector(".app-model-card__kicker")).not.toBeInTheDocument();
    expect(container.textContent).not.toMatch(/\bctx\b/i);
    expect(container.textContent).not.toMatch(/2024/);
    expect(screen.getByLabelText(/Add Gemini 3 Flash to quick picks/i)).toBeInTheDocument();
  });

  it("hides the tools hint when the model has no extra tooling", () => {
    const { container } = render(
      <ModelSelectionFeaturedCard
        model={{ ...model, supports_tools: false }}
        isPinned={false}
        onTogglePin={jest.fn()}
        onSelect={jest.fn()}
        averageCost={0}
        isSelected={false}
      />,
    );

    expect(container.querySelector(".app-model-card__tools-hint")).not.toBeInTheDocument();
    expect(container.querySelector(".app-model-card__cost")).toHaveTextContent("Free");
  });

  it("highlights the currently selected model like a sidebar list row", () => {
    const { container } = render(
      <ModelSelectionFeaturedCard
        model={model}
        isPinned
        onTogglePin={jest.fn()}
        onSelect={jest.fn()}
        averageCost={23}
        isSelected
        onShowDetails={jest.fn()}
      />,
    );

    expect(container.querySelector(".app-model-card--selected")).toBeInTheDocument();
    expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "true");
  });
});
