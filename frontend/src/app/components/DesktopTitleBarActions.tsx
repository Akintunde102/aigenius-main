'use client';

import type { CSSProperties } from "react";
import Image from "next/image";
import {
  Bug,
  Check,
  ChevronDown,
  Copy,
  Database,
  ExternalLink,
  Eye,
  FileText,
  FolderOpen,
  Heart,
  LifeBuoy,
  Mail,
  ShieldCheck,
  Sliders,
} from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { openFilePreview } from "./modals/FilePreviewManager";

/** Re-enable root file explorer + local search index caption buttons when ready. */
const SHOW_EXTRA_CAPTION_ACTIONS = false;

/** `-webkit-app-region` is not in `CSSProperties` from csstype; Electron needs it for caption clicks. */
type ElectronCaptionStyle = CSSProperties & {
  WebkitAppRegion?: "drag" | "no-drag";
};

/** Matches `MAIN_SHELL_CHROME_SYMBOL` in `desktop/src/shell-chrome.ts` (WCO glyph color), fallback to CSS variable for light/dark mode. */
const TITLEBAR_SYMBOL = "var(--sidebar-fg, var(--sidebar-muted-fg, #a1a1aa))";

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
  "fixed z-[160] m-0 box-border flex items-center justify-center rounded-none border-0 p-0 outline-none transition-colors hover:bg-black/5 dark:hover:bg-white/[0.08] active:bg-black/10 dark:active:bg-white/[0.12] focus-visible:ring-2 focus-visible:ring-blue-500/30 cursor-pointer pointer-events-auto";

const CLOSE_BTN_CLASS =
  "fixed z-[160] m-0 box-border flex items-center justify-center rounded-none border-0 p-0 outline-none transition-colors hover:bg-[#e81123] active:bg-[#f1707a] hover:text-white focus-visible:ring-2 focus-visible:ring-blue-500/30 cursor-pointer pointer-events-auto";

export default function DesktopTitleBarActions() {
  const [mounted, setMounted] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [opacity, setOpacity] = useState(100);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const menuButtonRef = useRef<HTMLButtonElement | null>(null);

  const openExternalDoc = (url: string) => {
    setIsMenuOpen(false);
    if (typeof window !== "undefined") {
      if (window.aigeniusDesktop?.openExternalUrl) {
        void window.aigeniusDesktop.openExternalUrl(url);
      } else if (window.aigeniusDesktop?.openExternal) {
        window.aigeniusDesktop.openExternal(url);
      } else {
        window.open(url, "_blank", "noopener,noreferrer");
      }
    }
  };

  const handleCopySupportEmail = async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    const email = "nobox.hq@gmail.com";
    let copied = false;
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(email);
        copied = true;
      }
    } catch {
      copied = false;
    }

    if (!copied && typeof document !== "undefined") {
      try {
        const ta = document.createElement("textarea");
        ta.value = email;
        ta.setAttribute("readonly", "");
        ta.style.position = "fixed";
        ta.style.top = "-9999px";
        ta.style.left = "-9999px";
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        copied = document.execCommand("copy");
        document.body.removeChild(ta);
      } catch {
        copied = false;
      }
    }

    setCopiedEmail(true);
    toast.success(`Support email copied: ${email}`, {
      id: "support-copy-toast",
      icon: "📋",
      duration: 2500,
    });
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  const handleEmailSupport = (issueType: 'general' | 'bug' = 'general') => {
    const platform =
      typeof window !== 'undefined'
        ? window.aigeniusDesktop?.shellChrome?.platform ||
          (navigator.userAgent.includes('Win') ? 'win32' : 'other')
        : 'desktop';
    const subject =
      issueType === 'bug'
        ? 'AIGenius Desktop Issue Report'
        : 'AIGenius Desktop Support Request';
    const body =
      issueType === 'bug'
        ? `Hello AIGenius Support Team,%0D%0A%0D%0APlatform: ${platform}%0D%0AVersion: 0.1.0%0D%0A%0D%0APlease describe the issue you encountered:%0D%0A`
        : `Hello AIGenius Support Team,%0D%0A%0D%0APlatform: ${platform}%0D%0AVersion: 0.1.0%0D%0A%0D%0AMy question/request:%0D%0A`;
    const mailtoUrl = `mailto:nobox.hq@gmail.com?subject=${encodeURIComponent(subject)}&body=${body}`;
    openExternalDoc(mailtoUrl);
  };

  const handleOpacityChange = (newVal: number) => {
    const clamped = Math.max(15, Math.min(100, newVal));
    setOpacity(clamped);
    window.aigeniusDesktop?.setWindowOpacity?.(clamped / 100);
  };

  const toggleOpacity = () => {
    setOpacity((current) => {
      const next = current < 95 ? 100 : 70;
      window.aigeniusDesktop?.setWindowOpacity?.(next / 100);
      toast.success(next < 95 ? `Peek-through mode (${next}%)` : `Full opacity (${next}%)`, {
        icon: next < 95 ? '👻' : '🪟',
        id: 'window-opacity-toast',
        duration: 1500,
      });
      return next;
    });
  };

  useLayoutEffect(() => {
    setMounted(true);

    // Hydrate the initial maximize state so the button icon is correct on load.
    void window.aigeniusDesktop?.isWindowMaximized?.().then((m) => {
      setIsMaximized(m);
    });

    // Hydrate initial window opacity.
    void window.aigeniusDesktop?.getWindowOpacity?.().then((op) => {
      if (typeof op === 'number') {
        setOpacity(Math.round(op * 100));
      }
    });

    // Subscribe to maximize/restore changes driven by the OS (e.g. snap, double-click titlebar).
    const unsubMaximize = window.aigeniusDesktop?.onWindowMaximizeChange?.((m) => {
      setIsMaximized(m);
    });

    // Subscribe to opacity changes driven by OS / native menus.
    const unsubOpacity = window.aigeniusDesktop?.onWindowOpacityChange?.((op) => {
      if (typeof op === 'number') {
        setOpacity(Math.round(op * 100));
      }
    });

    return () => {
      unsubMaximize?.();
      unsubOpacity?.();
    };
  }, []);

  // Global meaningful shortcut: Ctrl+Shift+O (Windows/Linux) or Cmd+Shift+O (macOS)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (!window.aigeniusDesktop?.setWindowOpacity) {
        return;
      }
      const isCmdOrCtrl = e.metaKey || e.ctrlKey;
      if (isCmdOrCtrl && e.shiftKey && (e.key === 'O' || e.key === 'o')) {
        e.preventDefault();
        e.stopPropagation();
        toggleOpacity();
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, []);

  useEffect(() => {
    if (!isMenuOpen) return;

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (
        menuRef.current &&
        !menuRef.current.contains(target) &&
        menuButtonRef.current &&
        !menuButtonRef.current.contains(target)
      ) {
        setIsMenuOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsMenuOpen(false);
      }
    };

    const handleBlur = () => {
      setIsMenuOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("blur", handleBlur);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("blur", handleBlur);
    };
  }, [isMenuOpen]);

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

  const isDarwin = detectedPlatform === 'darwin';
  const productLeftPx = isDarwin ? 80 : 12;
  const buttonHeight = Math.min(26, Math.max(20, topPx - 8));
  const buttonTop = Math.max(0, Math.floor((topPx - buttonHeight) / 2));

  return (
    <>
      {/* Product Name button on the top-left of the title bar */}
      <button
        ref={menuButtonRef}
        type="button"
        id="desktop-product-menu-button"
        aria-label="AIGenius product menu"
        aria-haspopup="true"
        aria-expanded={isMenuOpen}
        onClick={() => setIsMenuOpen((prev) => !prev)}
        className={`fixed z-[160] m-0 box-border inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[12.5px] font-semibold tracking-wide outline-none transition-all duration-150 cursor-pointer pointer-events-auto select-none group ${
          isMenuOpen
            ? "bg-black/10 dark:bg-white/[0.14] text-[var(--sidebar-fg,#f4f4f5)] ring-1 ring-black/10 dark:ring-white/20 shadow-xs"
            : "text-[var(--sidebar-fg,#f4f4f5)] opacity-90 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/[0.08] focus-visible:ring-2 focus-visible:ring-blue-500/40"
        }`}
        style={{
          top: buttonTop,
          left: productLeftPx,
          height: buttonHeight,
          color: "var(--sidebar-fg)",
          WebkitAppRegion: "no-drag",
        } as ElectronCaptionStyle}
      >
        <span className="font-semibold text-zinc-900 dark:text-zinc-100">AIGenius</span>
        <ChevronDown
          className={`h-3 w-3 text-zinc-500 dark:text-zinc-400 transition-transform duration-200 ${
            isMenuOpen ? "rotate-180 text-blue-500 dark:text-blue-400" : "group-hover:text-zinc-700 dark:group-hover:text-zinc-200"
          }`}
          strokeWidth={2}
          aria-hidden
        />
      </button>

      {/* Dropdown Menu when product name is clicked */}
      {isMenuOpen && (
        <div
          ref={menuRef}
          role="menu"
          aria-labelledby="desktop-product-menu-button"
          className="fixed z-[200] w-[330px] rounded-2xl border border-zinc-200/90 dark:border-zinc-800/90 bg-white/95 dark:bg-[#16161a]/95 backdrop-blur-xl p-3 shadow-2xl text-zinc-900 dark:text-zinc-100 text-left transition-all duration-150 animate-in fade-in zoom-in-95"
          style={{
            top: topPx + 5,
            left: productLeftPx,
            WebkitAppRegion: "no-drag",
          } as ElectronCaptionStyle}
        >
          {/* Header Banner */}
          <div className="flex items-center justify-between pb-2.5 border-b border-zinc-100 dark:border-zinc-800/80">
            <div className="flex items-center gap-2.5">
              <Image
                src="/logo.png"
                alt=""
                width={32}
                height={32}
                className="h-8 w-8 shrink-0 rounded-xl shadow-md shadow-blue-500/20"
                priority
              />
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-xs text-zinc-900 dark:text-zinc-100 leading-none">
                    AIGenius Desktop
                  </span>
                  <span className="rounded-full bg-blue-50 dark:bg-blue-950/70 border border-blue-200 dark:border-blue-800/60 px-1.5 py-0.5 text-[9.5px] font-mono font-medium text-blue-600 dark:text-blue-400">
                    v0.1.0
                  </span>
                </div>
                <p className="text-[10.5px] text-zinc-500 dark:text-zinc-400 mt-1 leading-tight">
                  All the best AI models. In one simple app.
                </p>
              </div>
            </div>
          </div>

          {/* Section: Opacity & Window controls */}
          <div className="pt-2 pb-2">
            <div className="px-1 mb-1.5 flex items-center justify-between">
              <span className="text-[10px] font-bold tracking-wider text-zinc-400 dark:text-zinc-500 uppercase flex items-center gap-1.5">
                <Sliders className="w-3 h-3 text-blue-500" strokeWidth={2.2} />
                Window & Display
              </span>
            </div>

            <div className="flex items-center justify-between text-[11px] mb-1.5 px-0.5">
              <span className="font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500" strokeWidth={2} />
                Opacity
              </span>
              <span className="font-mono text-[10.5px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/80 border border-blue-200/70 dark:border-blue-800/60 px-1.5 py-0.2 rounded-md">
                {opacity}%
              </span>
            </div>

            <input
              type="range"
              role="slider"
              id="desktop-opacity-slider"
              aria-label="Window opacity slider"
              aria-valuemin={15}
              aria-valuemax={100}
              aria-valuenow={opacity}
              min={15}
              max={100}
              step={5}
              value={opacity}
              onChange={(e) => handleOpacityChange(Number(e.target.value))}
              className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-blue-600 dark:accent-blue-500"
            />

            {/* Quick preset pills */}
            <div className="flex items-center justify-between gap-1.5 pt-1.5">
              {[
                { label: '30%', val: 30 },
                { label: '50%', val: 50 },
                { label: '70%', val: 70 },
                { label: '100%', val: 100 },
              ].map((item) => (
                <button
                  key={item.val}
                  type="button"
                  onClick={() => handleOpacityChange(item.val)}
                  className={`flex-1 py-1 text-[10px] rounded-lg font-mono font-medium transition-all text-center cursor-pointer border ${
                    opacity === item.val
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                      : 'bg-zinc-100/80 dark:bg-zinc-800/60 hover:bg-zinc-200/80 dark:hover:bg-zinc-700/80 text-zinc-700 dark:text-zinc-300 border-zinc-200/60 dark:border-zinc-700/60'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {/* Meaningful shortcut hint and quick toggle */}
            <button
              type="button"
              onClick={toggleOpacity}
              className="w-full flex items-center justify-between text-[11px] text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-100/60 dark:hover:bg-zinc-800/40 px-1.5 py-1 rounded-md transition-colors mt-1.5 cursor-pointer"
            >
              <span>Toggle peek mode</span>
              <span className="flex items-center gap-1 text-[10.5px] text-zinc-500 dark:text-zinc-400">
                {isDarwin ? (
                  <>
                    <kbd className="!font-sans px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 font-semibold text-zinc-800 dark:text-zinc-200">⌘</kbd>
                    <kbd className="!font-sans px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 font-semibold text-zinc-800 dark:text-zinc-200">⇧</kbd>
                    <kbd className="!font-sans px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 font-semibold text-zinc-800 dark:text-zinc-200">O</kbd>
                  </>
                ) : (
                  <>
                    <kbd className="!font-sans px-1 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 font-semibold text-zinc-800 dark:text-zinc-200">Ctrl</kbd>
                    <span>+</span>
                    <kbd className="!font-sans px-1 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 font-semibold text-zinc-800 dark:text-zinc-200">Shift</kbd>
                    <span>+</span>
                    <kbd className="!font-sans px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 font-semibold text-zinc-800 dark:text-zinc-200">O</kbd>
                  </>
                )}
              </span>
            </button>
          </div>

          <div className="border-t border-zinc-100 dark:border-zinc-800/80 my-1" />

          {/* Section: Contact Us & Issue Reporting */}
          <div className="py-1.5">
            <div className="flex items-center justify-between px-1 mb-1.5">
              <span className="text-[10px] font-bold tracking-wider text-zinc-400 dark:text-zinc-500 uppercase flex items-center gap-1.5">
                <LifeBuoy className="w-3 h-3 text-blue-500" strokeWidth={2.2} />
                Contact Us & Issues
              </span>
            </div>

            <div className="rounded-xl border border-blue-100 dark:border-blue-900/40 bg-blue-50/50 dark:bg-blue-950/20 p-2.5 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="text-[11.5px] font-semibold text-zinc-900 dark:text-zinc-100">
                    Direct Engineering Support
                  </div>
                  <div className="text-[10.5px] text-zinc-500 dark:text-zinc-400">
                    For any bugs, crashes, account or setup issues
                  </div>
                </div>
              </div>

              {/* Email Address with Copy button */}
              <div className="flex items-center justify-between gap-2 rounded-lg bg-white/90 dark:bg-zinc-900/80 border border-zinc-200/80 dark:border-zinc-800 px-2 py-1.5 text-xs">
                <div className="flex items-center gap-1.5 min-w-0">
                  <Mail className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                  <span className="font-mono text-[11px] text-zinc-800 dark:text-zinc-200 select-all truncate">
                    nobox.hq@gmail.com
                  </span>
                </div>
                <button
                  type="button"
                  aria-label="Copy support email"
                  onClick={handleCopySupportEmail}
                  className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/80 border border-transparent hover:border-blue-200 dark:hover:border-blue-800 transition-colors cursor-pointer shrink-0"
                >
                  {copiedEmail ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-500" />
                      <span className="text-emerald-600 dark:text-emerald-400">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>

              {/* Action buttons: Email Support & Report Bug */}
              <div className="flex items-center gap-1.5 pt-0.5">
                <button
                  type="button"
                  onClick={() => handleEmailSupport('general')}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white px-2 py-1.5 text-[11px] font-medium shadow-xs transition-colors cursor-pointer"
                >
                  <Mail className="w-3 h-3" />
                  <span>Email Support</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleEmailSupport('bug')}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-white dark:bg-zinc-800/90 hover:bg-zinc-100 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 px-2 py-1.5 text-[11px] font-medium transition-colors cursor-pointer"
                >
                  <Bug className="w-3 h-3 text-amber-500" />
                  <span>Report Bug</span>
                </button>
              </div>
            </div>
          </div>

          <div className="border-t border-zinc-100 dark:border-zinc-800/80 my-1" />

          {/* Section: Website, Terms of Service & Privacy Policy */}
          <div className="py-1">
            <div className="px-1 mb-1">
              <span className="text-[10px] font-bold tracking-wider text-zinc-400 dark:text-zinc-500 uppercase">
                Legal & Resources
              </span>
            </div>

            <div className="space-y-0.5">
              <button
                type="button"
                onClick={() => openExternalDoc("https://aigenius.noboxlabs.xyz/docs/terms-and-conditions")}
                className="w-full flex items-center justify-between rounded-lg px-2 py-1.5 text-xs text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/70 transition-colors group cursor-pointer text-left"
              >
                <span className="flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5 text-zinc-400 group-hover:text-blue-500 transition-colors" />
                  <span>Terms of Service</span>
                </span>
                <ExternalLink className="w-3 h-3 text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-300 transition-colors" />
              </button>

              <button
                type="button"
                onClick={() => openExternalDoc("https://aigenius.noboxlabs.xyz/docs/privacy-policy")}
                className="w-full flex items-center justify-between rounded-lg px-2 py-1.5 text-xs text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/70 transition-colors group cursor-pointer text-left"
              >
                <span className="flex items-center gap-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-zinc-400 group-hover:text-emerald-500 transition-colors" />
                  <span>Privacy Policy</span>
                </span>
                <ExternalLink className="w-3 h-3 text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-300 transition-colors" />
              </button>
            </div>
          </div>

          <div className="border-t border-zinc-100 dark:border-zinc-800/80 my-1" />

          {/* Footer Bar */}
          <div className="flex items-center justify-between pt-0.5 px-1">
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                toast.success("We love you too! ❤️");
                setIsMenuOpen(false);
              }}
              className="inline-flex items-center gap-1.5 rounded-md px-1.5 py-1 text-[11px] font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800/70 cursor-pointer group transition-colors"
            >
              <span>We love you</span>
              <Heart className="w-3 h-3 text-rose-500 fill-rose-500 group-hover:scale-125 transition-transform duration-150" />
            </button>

            <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium">
              Nobox Labs
            </span>
          </div>
        </div>
      )}

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
