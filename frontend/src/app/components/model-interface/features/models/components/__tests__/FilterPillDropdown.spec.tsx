import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { FilterPillDropdown } from "../FilterPillDropdown";
import "@testing-library/jest-dom";

const options = [
  { value: "", label: "All labs" },
  { value: "openai", label: "OpenAI" },
  { value: "anthropic", label: "Anthropic" },
];

describe("FilterPillDropdown", () => {
  it("opens the menu in a portal when the trigger is clicked", async () => {
    const onChange = jest.fn();
    render(
      <div style={{ overflow: "hidden", height: 28 }}>
        <FilterPillDropdown
          value=""
          options={options}
          onChange={onChange}
          placeholder="Labs"
          ariaLabel="Filter by lab"
        />
      </div>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Filter by lab" }));

    await waitFor(() => {
      expect(screen.getByRole("listbox", { name: "Filter by lab" })).toBeInTheDocument();
    });
    expect(screen.getByRole("option", { name: "OpenAI" })).toBeInTheDocument();
  });

  it("calls onChange and closes when an option is selected", async () => {
    const onChange = jest.fn();
    render(
      <FilterPillDropdown
        value=""
        options={options}
        onChange={onChange}
        placeholder="Labs"
        ariaLabel="Filter by lab"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Filter by lab" }));
    fireEvent.click(await screen.findByRole("option", { name: "Anthropic" }));

    expect(onChange).toHaveBeenCalledWith("anthropic");
    await waitFor(() => {
      expect(screen.queryByRole("listbox", { name: "Filter by lab" })).not.toBeInTheDocument();
    });
  });

  it("closes when clicking outside the menu", async () => {
    render(
      <>
        <button type="button">Outside</button>
        <FilterPillDropdown
          value=""
          options={options}
          onChange={jest.fn()}
          placeholder="Labs"
          ariaLabel="Filter by lab"
        />
      </>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Filter by lab" }));
    expect(await screen.findByRole("listbox", { name: "Filter by lab" })).toBeInTheDocument();

    fireEvent.mouseDown(screen.getByRole("button", { name: "Outside" }));

    await waitFor(() => {
      expect(screen.queryByRole("listbox", { name: "Filter by lab" })).not.toBeInTheDocument();
    });
  });
});
