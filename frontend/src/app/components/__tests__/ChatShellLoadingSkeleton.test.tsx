/**
 * @jest-environment jsdom
 */
import React from "react";
import { render } from "@testing-library/react";
import "@testing-library/jest-dom";
import { ChatShellLoadingSkeleton } from "../ChatShellLoadingSkeleton";

describe("ChatShellLoadingSkeleton", () => {
  it("renders sidebar placeholder, main column, and composer strip", () => {
    const { container } = render(<ChatShellLoadingSkeleton />);

    const root = container.firstElementChild as HTMLElement;
    expect(root).toBeTruthy();
    expect(root.className).toContain("flex");

    const aside = container.querySelector("aside");
    expect(aside).not.toBeNull();
    expect(aside).toHaveAttribute("aria-hidden", "true");

    const composer = container.querySelector(
      ".border-t.border-slate-200\\/60",
    );
    expect(composer).not.toBeNull();
    const composerBar = composer?.querySelector(".rounded-xl.bg-slate-100");
    expect(composerBar).not.toBeNull();
    expect((composerBar as HTMLElement).className).toContain("h-[52px]");
  });

  it("merges outerMinHeightStyle over default min-height", () => {
    const { container } = render(
      <ChatShellLoadingSkeleton
        outerMinHeightStyle={{ minHeight: 0, flex: 1 }}
      />,
    );
    const root = container.firstElementChild as HTMLElement;
    expect(["0", "0px"]).toContain(root.style.minHeight);
  });
});
