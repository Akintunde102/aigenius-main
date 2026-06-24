'use client';

import type { CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { Database, FolderOpen } from "lucide-react";
import { useLayoutEffect, useState } from "react";
import { openFilePreview } from "./modals/FilePreviewManager";

/** `-webkit-app-region` is not in `CSSProperties` from csstype; Electron needs it for caption clicks. */
type ElectronCaptionStyle = CSSProperties & {
  WebkitAppRegion?: "drag" | "no-drag";
};

/** Matches `MAIN_SHELL_CHROME_SYMBOL` in `desktop/src/shell-chrome.ts` (WCO glyph color). */
const TITLEBAR_SYMBOL = "#a1a1aa";

/** Thin “+” to align with GTK / Electron WCO line icons (~1px stroke). */
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

/**
 * Caption buttons left of native window controls (Windows/Linux) or trailing edge (macOS).
 * Must use `no-drag` so clicks register. Frameless shells often hide the OS menu — we expose
 * “Local search index” here next to “New window”.
 *
 * Gated until after mount so SSR + first client paint match (no `aigeniusDesktop` on server).
 */
/** High enough to sit above chat chrome; below full-screen modals (z 9999+). */
const CAPTION_BTN_CLASS =
  "fixed z-[160] m-0 box-border flex items-center justify-center rounded-none border-0 p-0 outline-none transition-colors hover:bg-white/[0.08] active:bg-white/[0.12] focus-visible:ring-2 focus-visible:ring-white/25 focus-visible:ring-offset-0 cursor-pointer pointer-events-auto";

export default function DesktopTitleBarActions() {
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useLayoutEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  const chrome = window.aigeniusDesktop?.shellChrome;
  if (!chrome) {
    return null;
  }

  const topPx = chrome.titleBarTopPx;
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

  /** Second slot left of “new window” (frameless shells hide File/View menus on Windows/Linux). */
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
        if (ctx?.desktopHost?.platform === "win32") {
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

  return (
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
  );
}
