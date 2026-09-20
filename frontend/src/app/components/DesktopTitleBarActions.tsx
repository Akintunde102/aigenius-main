'use client';

import type { CSSProperties } from "react";
import { Database, FolderOpen } from "lucide-react";
import { useLayoutEffect, useState } from "react";
import { openFilePreview } from "./modals/FilePreviewManager";

/** Re-enable root file explorer + local search index caption buttons when ready. */
const SHOW_EXTRA_CAPTION_ACTIONS = false;

/** `-webkit-app-region` is not in `CSSProperties` from csstype; Electron needs it for caption clicks. */
type ElectronCaptionStyle = CSSProperties & {
  WebkitAppRegion?: "drag" | "no-drag";
};

/** Matches `MAIN_SHELL_CHROME_SYMBOL` in `desktop/src/shell-chrome.ts` (WCO glyph color). */
const TITLEBAR_SYMBOL = "#a1a1aa";

/** Thin "+" to align with GTK / Electron WCO line icons (~1px stroke). */
function CaptionPlusGlyph() {
  return (
    <svg
      width={10}
      height={10}
      viewBox="0 0 10 10"
      aria-hidden
      className="shrink-0"
    >
      <path
        d="M5 2.5v5M2.5 5h5"
        fill="none"
        stroke="currentColor"
        strokeWidth={1}
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Minimize icon — horizontal line. */
function MinimizeGlyph() {
  return (
    <svg width={10} height={10} viewBox="0 0 10 10" aria-hidden className="shrink-0">
      <path d="M2 5h6" stroke="currentColor" strokeWidth={1} strokeLinecap="round" fill="none" />
    </svg>
  );
}

/** Maximize icon — square outline. */
function MaximizeGlyph() {
  return (
    <svg width={10} height={10} viewBox="0 0 10 10" aria-hidden className="shrink-0">
      <rect x="2" y="2" width="6" height="6" stroke="currentColor" strokeWidth={1} fill="none" />
    </svg>
  );
}

/** Restore icon — overlapping squares (maximized → normal). */
function RestoreGlyph() {
  return (
    <svg width={10} height={10} viewBox="0 0 10 10" aria-hidden className="shrink-0">
      <rect x="3.5" y="1.5" width="5" height="5" stroke="currentColor" strokeWidth={1} fill="none" />
      <path d="M1.5 4v4.5H6" stroke="currentColor" strokeWidth={1} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Close icon — X. */
function CloseGlyph() {
  return (
    <svg width={10} height={10} viewBox="0 0 10 10" aria-hidden className="shrink-0">
      <path d="M2.5 2.5l5 5M7.5 2.5l-5 5" stroke="currentColor" strokeWidth={1} strokeLinecap="round" fill="none" />
    </svg>
  );
}

/**
 * Caption buttons left of native window controls (Windows/Linux) or trailing edge (macOS).
 * Must use `no-drag` so clicks register. Frameless shells often hide the OS menu — we expose
 * "Local search index" here next to "New window".
 *
 * Gated until after mount so SSR + first client paint match (no `aigeniusDesktop` on server).
 */
/** High enough to sit above chat chrome; below full-screen modals (z 9999+). */
const CAPTION_BTN_CLASS =
  "fixed z-[160] m-0 box-border flex items-center justify-center rounded-none border-0 p-0 outline-none transition-colors hover:bg-white/[0.08] active:bg-white/[0.12] focus-visible:ring-2 focus-visible:ring-white/25 focus-visible:ring-offset-0 cursor-pointer pointer-events-auto";

const CLOSE_BTN_CLASS =
  "fixed z-[160] m-0 box-border flex items-center justify-center rounded-none border-0 p-0 outline-none transition-colors hover:bg-[#e81123] active:bg-[#f1707a] focus-visible:ring-2 focus-visible:ring-white/25 focus-visible:ring-offset-0 cursor-pointer pointer-events-auto";

export default function DesktopTitleBarActions() {
  const [mounted, setMounted] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);

  useLayoutEffect(() => {
    setMounted(true);

    // Hydrate the initial maximize state so the button icon is correct on load.
    void window.aigeniusDesktop?.isWindowMaximized?.().then((m) => {
      setIsMaximized(m);
    });

    // Subscribe to maximize/restore changes driven by the OS (e.g. snap, double-click titlebar).
    const unsub = window.aigeniusDesktop?.onWindowMaximizeChange?.((m) => {
      setIsMaximized(m);
    });
    return () => {
      unsub?.();
    };
  }, []);

  if (!mounted) {
    return null;
  }

  const chrome = window.aigeniusDesktop?.shellChrome;
  if (!chrome) {
    return null;
  }

  const topPx = chrome.titleBarTopPx;
  if (topPx <= 0) {
    return null;
  }
  const rightInsetPx = chrome.titleBarRightInsetPx ?? 138;
  /** One Windows 11–style caption control width (~138px total for three buttons). */
  const captionSlotPx = 46;

  const baseCaptionSlot = (): Omit<ElectronCaptionStyle, "right"> => ({
    top: 0,
    width: captionSlotPx,
    height: topPx,
    color: TITLEBAR_SYMBOL,
    backgroundColor: "transparent",
    WebkitAppRegion: "no-drag",
  });

  /** Second slot left of "new window" (frameless shells hide File/View menus on Windows/Linux). */
  const indexStyle: ElectronCaptionStyle = {
    ...baseCaptionSlot(),
    right: rightInsetPx + captionSlotPx,
  };

  const newWindowStyle: ElectronCaptionStyle = {
    ...baseCaptionSlot(),
    right: rightInsetPx,
  };

  const fileBrowserStyle: ElectronCaptionStyle = {
    ...baseCaptionSlot(),
    right: rightInsetPx + 2 * captionSlotPx,
  };

  const handleOpenFileBrowser = async () => {
    try {
      let rootPath = "/";
      const getContext = window.aigeniusDesktop?.getChatRuntimeContext;
      if (getContext) {
        const ctx = await getContext();
        const home = ctx?.desktopHost?.userHomeDir?.trim();
        if (home) {
          rootPath = home;
        } else if (ctx?.desktopHost?.platform === "win32") {
          rootPath = "C:/";
        }
      }
      openFilePreview({
        url: "",
        name: "Root Explorer",
        type: "folder",
        localPath: rootPath,
      });
    } catch (err) {
      console.error("[DesktopTitleBarActions] File browser open error:", err);
    }
  };

  // Custom window controls are only needed on Windows frameless (win32 + frame:false).
  // Linux uses native WCO buttons from titleBarOverlay; macOS uses traffic lights.
  // We check chrome.platform first (set by the new preload), then fall back to
  // navigator.userAgent / the presence of minimizeWindow IPC for older cached builds.
  const detectedPlatform: string =
    chrome.platform ||
    (navigator.userAgent.includes('Win') ? 'win32' : 'other');
  const isWin32Frameless = rightInsetPx > 0 && detectedPlatform === 'win32';

  /** Custom minimize/maximize/close buttons — only shown on Windows frameless mode. */
  const WindowControls = isWin32Frameless ? (
    <>
      {/* Minimize — third button from the right */}
      <button
        type="button"
        id="desktop-window-minimize"
        aria-label="Minimize window"
        title="Minimize"
        onClick={() => window.aigeniusDesktop?.minimizeWindow?.()}
        className={CAPTION_BTN_CLASS}
        style={{
          ...baseCaptionSlot(),
          right: captionSlotPx * 2,
        }}
      >
        <MinimizeGlyph />
      </button>

      {/* Maximize / Restore — second button from the right */}
      <button
        type="button"
        id="desktop-window-maximize"
        aria-label={isMaximized ? "Restore window" : "Maximize window"}
        title={isMaximized ? "Restore" : "Maximize"}
        onClick={() => window.aigeniusDesktop?.maximizeWindow?.()}
        className={CAPTION_BTN_CLASS}
        style={{
          ...baseCaptionSlot(),
          right: captionSlotPx,
        }}
      >
        {isMaximized ? <RestoreGlyph /> : <MaximizeGlyph />}
      </button>

      {/* Close — rightmost button */}
      <button
        type="button"
        id="desktop-window-close"
        aria-label="Close window"
        title="Close"
        onClick={() => window.aigeniusDesktop?.closeWindow?.()}
        className={CLOSE_BTN_CLASS}
        style={{
          ...baseCaptionSlot(),
          right: 0,
        }}
      >
        <CloseGlyph />
      </button>
    </>
  ) : null;

  return (
    <>
      {SHOW_EXTRA_CAPTION_ACTIONS ? (
        <>
          <button
            type="button"
            aria-label="Root File Explorer"
            title="Open Monaco Root File Explorer"
            onClick={handleOpenFileBrowser}
            className={CAPTION_BTN_CLASS}
            style={fileBrowserStyle}
          >
            <FolderOpen className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden />
          </button>
          <button
            type="button"
            aria-label="Local search index"
            title="Local search index — SQLite file_index & excerpts"
            onClick={() => {
              void window.aigeniusDesktop?.openNewWindow?.("/desktop-search-index");
            }}
            className={CAPTION_BTN_CLASS}
            style={indexStyle}
          >
            <Database className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden />
          </button>
        </>
      ) : null}
      <button
        type="button"
        aria-label="New window"
        title="New window"
        onClick={() => {
          void window.aigeniusDesktop?.openNewWindow?.();
        }}
        className={CAPTION_BTN_CLASS}
        style={newWindowStyle}
      >
        <CaptionPlusGlyph />
      </button>
      {WindowControls}
    </>
  );
}
