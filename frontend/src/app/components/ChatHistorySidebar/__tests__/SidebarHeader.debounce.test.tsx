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
  };
});

describe("SidebarHeader (history search debounce)", () => {
  beforeEach(() => {
    jest.useFakeTimers({ advanceTimers: true });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("updates the draft immediately but pushes to parent only after debounce", () => {
    const setHistorySearch = jest.fn();
    render(
      <SidebarHeader
        isMobile={false}
        mobileSidebarOpen={false}
        setMobileSidebarOpen={jest.fn()}
        historySearch=""
        setHistorySearch={setHistorySearch}
      />,
    );

    const input = screen.getByRole("searchbox", {
      name: /search conversations/i,
    });
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
    const setHistorySearch = jest.fn();
    const { rerender } = render(
      <SidebarHeader
        isMobile={false}
        mobileSidebarOpen={false}
        setMobileSidebarOpen={jest.fn()}
        historySearch=""
        setHistorySearch={setHistorySearch}
      />,
    );

    const input = screen.getByRole("searchbox", {
      name: /search conversations/i,
    });

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
