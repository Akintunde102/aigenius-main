"use client";

import type { CSSProperties, ReactNode } from "react";
import { useLayoutEffect } from "react";
import DesktopTitleBarActions from "./DesktopTitleBarActions";
import DesktopOpacityFloatingControl from "./DesktopOpacityFloatingControl";

/** `-webkit-app-region` is not in the csstype CSSProperties; cast to allow it. */
type DragStyle = CSSProperties & { WebkitAppRegion?: "drag" | "no-drag" };

function syncDesktopChromeCssVars(): void {
  const c = window.aigeniusDesktop?.shellChrome;
  const root = document.documentElement;
  if (!c) {
    root.style.removeProperty("--aigenius-desktop-titlebar-top");
    root.style.removeProperty("--aigenius-desktop-content-left");
    root.style.removeProperty("--aigenius-desktop-titlebar-right-inset");
    return;
  }
  root.style.setProperty("--aigenius-desktop-titlebar-top", `${c.titleBarTopPx}px`);
  root.style.setProperty("--aigenius-desktop-content-left", `${c.contentLeftPx}px`);
  root.style.setProperty(
    "--aigenius-desktop-titlebar-right-inset",
    `${c.titleBarRightInsetPx}px`,
  );
}

/**
 * VS Code–style shell: reserves space under the custom title region and exposes a drag band
 * so the window moves when grabbing the top strip (Electron only; no-op in the browser).
 *
 * The shell is viewport-locked (100dvh) so app surfaces with `flex-1 min-h-0` chains (chat,
 * docs, workflow studio) fill exactly one screen and scroll internally. It scrolls vertically
 * rather than clipping so taller public/marketing pages (landing, published conversations)
 * remain reachable — those scroll inside the shell instead of the document.
 */
export default function DesktopShellChrome({
  children,
}: {
  children: ReactNode;
}) {
  if (typeof window !== "undefined" && window.aigeniusDesktop?.shellChrome) {
    syncDesktopChromeCssVars();
  }

  useLayoutEffect(() => {
    syncDesktopChromeCssVars();
  }, []);

  const dragStripStyle: DragStyle = {
    height: "var(--aigenius-desktop-titlebar-top, 0px)",
    backgroundColor: "var(--sidebar-bg, transparent)",
    // Make the whole strip draggable; child elements override with no-drag as needed.
    WebkitAppRegion: "drag",
  };

  return (
    <>
      <div
        aria-hidden
        className="aigenius-desktop-drag-strip fixed left-0 right-0 top-0 z-[100]"
        style={dragStripStyle}
      />
      <DesktopTitleBarActions />
      <DesktopOpacityFloatingControl />
      <div
        className="aigenius-desktop-app-shell flex min-h-0 flex-col overflow-y-auto overflow-x-hidden overscroll-y-contain"
        style={{
          height: "100dvh",
          maxHeight: "100dvh",
          paddingTop: "var(--aigenius-desktop-titlebar-top, 0px)",
          paddingLeft: "var(--aigenius-desktop-content-left, 0px)",
          boxSizing: "border-box",
        }}
      >
        {children}
      </div>
    </>
  );
}
