/**
 * @jest-environment jsdom
 */
import React from "react";
import {
  render,
  screen,
  fireEvent,
  act,
} from "@testing-library/react";
import "@testing-library/jest-dom";
import SidebarHeader from "../SidebarHeader";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), prefetch: jest.fn() }),
}));

jest.mock("@/lib/utils/auth-session", () => ({
  clearAuthSession: jest.fn(),
}));

jest.mock("lucide-react", () => {
  const React = require("react");
  return {
    Search: () => <span data-testid="icon-search" />,
    PanelLeft: () => <span data-testid="icon-panel" />,
    PanelLeftClose: () => <span data-testid="icon-panel-close" />,
  };
});

function renderHeader(
  overrides: Partial<React.ComponentProps<typeof SidebarHeader>> = {},
) {
  const setHistorySearch = jest.fn();
  const result = render(
    <SidebarHeader
      isMobile={false}
      mobileSidebarOpen={false}
      setMobileSidebarOpen={jest.fn()}
      historySearch=""
      setHistorySearch={setHistorySearch}
      {...overrides}
    />,
  );
  return { ...result, setHistorySearch };
}

function openHistorySearch() {
  const existing = screen.queryByRole("searchbox", {
    name: /search conversations/i,
  });
  if (existing) return existing;
  fireEvent.click(
    screen.getByRole("button", { name: /search conversations/i }),
  );
  return screen.getByRole("searchbox", {
    name: /search conversations/i,
  });
}

describe("SidebarHeader (history search debounce)", () => {
  beforeEach(() => {
    jest.useFakeTimers({ advanceTimers: true });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("uses compact sidebar type so the search placeholder matches conversation titles", () => {
    renderHeader();
    const input = openHistorySearch();

    expect(input).toHaveClass("text-xs");
    expect(input.className).not.toMatch(/text-\[14\.5px\]/);
  });

  it("updates the draft immediately but pushes to parent only after debounce", () => {
    const { setHistorySearch } = renderHeader();

    const input = openHistorySearch();
    fireEvent.change(input, { target: { value: "resume" } });

    expect(input).toHaveValue("resume");
    expect(setHistorySearch).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(100);
    });

    expect(setHistorySearch).toHaveBeenCalledTimes(1);
    expect(setHistorySearch).toHaveBeenCalledWith("resume");
  });

  it("syncs draft when parent historySearch changes", () => {
    const { rerender, setHistorySearch } = renderHeader();

    const input = openHistorySearch();

    rerender(
      <SidebarHeader
        isMobile={false}
        mobileSidebarOpen={false}
        setMobileSidebarOpen={jest.fn()}
        historySearch="cleared"
        setHistorySearch={setHistorySearch}
      />,
    );

    expect(input).toHaveValue("cleared");
  });
});
