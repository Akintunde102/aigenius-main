/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import {
  applyResolvedColorMode,
  LEGACY_THEME_STORAGE_KEY,
  COLOR_MODE_STORAGE_KEY,
} from "@/lib/color-mode";
import {
  detectDesktopOS,
  OS_LABELS,
  type DesktopOS,
} from "@/lib/utils/detect-desktop-os";
import "./home.css";

const PLATFORMS = [
  { id: "macos" as const, label: "macOS", href: null as string | null },
  {
    id: "windows" as const,
    label: "Windows",
    href: "https://pub-77b8636a163e4485850be3c560433232.r2.dev/AIGenius%20Setup%200.1.0.exe",
  },
  {
    id: "linux" as const,
    label: "Linux",
    href: "https://pub-77b8636a163e4485850be3c560433232.r2.dev/aigenius-desktop_0.1.0_arm64.deb",
  },
] as const;

const OS_ICONS: Record<string, React.ReactNode> = {
  macos: (
    <svg viewBox="0 0 24 24" fill="currentColor" stroke="none" aria-hidden>
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
    </svg>
  ),
  windows: (
    <svg viewBox="0 0 24 24" fill="currentColor" stroke="none" aria-hidden>
      <path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-12.9-1.801" />
    </svg>
  ),
  linux: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <polyline points="4 17 10 11 4 5" />
      <line x1="12" y1="19" x2="20" y2="19" />
    </svg>
  ),
};

/** Quiet checkmark used to indicate the detected OS row — no brand color, no uppercase pill. */
function DetectedCheckmark() {
  return (
    <svg
      className="detected-badge"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-label="Detected as your OS"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

export default function HomePage() {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [navDropdownOpen, setNavDropdownOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [detectedOS, setDetectedOS] = useState<DesktopOS>("unknown");
  const wrapRef = useRef<HTMLDivElement>(null);
  const navDropRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Detect OS once on mount
  useEffect(() => {
    setDetectedOS(detectDesktopOS());
  }, []);

  const detectedPlatform = PLATFORMS.find((p) => p.id === detectedOS);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
      if (
        navDropRef.current &&
        !navDropRef.current.contains(e.target as Node)
      ) {
        setNavDropdownOpen(false);
      }
    };

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setDropdownOpen(false);
        setNavDropdownOpen(false);
        setAboutOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEsc);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEsc);
    };
  }, []);

  // Close modal on backdrop click
  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
      setAboutOpen(false);
    }
  }, []);

  const toggleTheme = () => {
    const html = document.documentElement;
    const next = html.getAttribute("data-theme") === "dark" ? "light" : "dark";
    try {
      localStorage.setItem(LEGACY_THEME_STORAGE_KEY, next);
      localStorage.setItem(COLOR_MODE_STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
    applyResolvedColorMode(next);
  };

  return (
    <div className="home-root">
      <div className="page">
        {/* Nav */}
        <nav className="nav">
          <Link href="/" className="nav-logo">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-primary shadow-md shadow-cyan-900/40 transition-transform group-hover:scale-105">
              <svg
                className="h-5 w-5 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden={true}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
            </div>
            <span className="nav-logo-text">AIGenius</span>
          </Link>

          <div className="nav-links">
            <button
              type="button"
              className="about-nav-btn"
              onClick={() => setAboutOpen(true)}
            >
              About
            </button>

            <Link href="/login" className="nav-signin">
              Sign in
            </Link>
            <button
              type="button"
              className="theme-toggle"
              aria-label="Toggle theme"
              onClick={toggleTheme}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                width="14"
                height="14"
                aria-hidden={true}
              >
                <circle cx="12" cy="12" r="9" />
                <line x1="12" y1="3" x2="12" y2="21" />
              </svg>
            </button>

            {/* Nav Download CTA — primary button, last in navbar */}
            <div
              className={"nav-download-wrap" + (navDropdownOpen ? " open" : "")}
              ref={navDropRef}
            >
              <button
                type="button"
                className="nav-download-cta"
                aria-expanded={navDropdownOpen}
                aria-haspopup="menu"
                onClick={() => setNavDropdownOpen(!navDropdownOpen)}
              >
                <svg
                  className="dl-icon"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden={true}
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                {detectedOS !== "unknown"
                  ? `Download for ${OS_LABELS[detectedOS]}`
                  : "Download"}
                <svg
                  className={
                    "nav-dd-chevron" + (navDropdownOpen ? " open" : "")
                  }
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden={true}
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>

              <ul className="nav-dd-menu" role="menu">
                {PLATFORMS.map((platform) => {
                  const isDetected = platform.id === detectedOS;
                  const Component = platform.href ? "a" : "button";
                  return (
                    <li key={platform.id} role="none">
                      <Component
                        {...(platform.href
                          ? {
                              href: platform.href,
                              download: true,
                              target: "_blank",
                              rel: "noopener noreferrer",
                            }
                          : { type: "button" as const })}
                        role="menuitem"
                        className={
                          "nav-dd-item" +
                          (!platform.href ? " disabled" : "") +
                          (isDetected ? " detected" : "")
                        }
                      >
                        <span className="dd-icon">{OS_ICONS[platform.id]}</span>
                        {platform.label}
                        {!platform.href && <span className="soon">Soon</span>}
                        {isDetected && platform.href && <DetectedCheckmark />}
                      </Component>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </nav>

        {/* Main */}
        <main className="main">
          {/* Left: Copy & CTA */}
          <div className="content">
            <h1 className="headline">
              Chat with every AI
              <br />
              model, in one place.
            </h1>
            <p className="subtext">
              Switch between GPT, Claude, Gemini and more — without juggling
              tabs or subscriptions. Bring files, voice, and projects. Pay only
              for what you use.
            </p>

            <div className="cta-wrap">
              <div
                className={"download-wrap" + (dropdownOpen ? " open" : "")}
                ref={wrapRef}
              >
                <button
                  type="button"
                  className="download-btn"
                  aria-expanded={dropdownOpen}
                  aria-haspopup="menu"
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                >
                  <svg
                    className="dl-icon"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden={true}
                  >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  {detectedOS !== "unknown"
                    ? `Download for ${OS_LABELS[detectedOS]}`
                    : "Download desktop app"}
                  <svg
                    className="chevron"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden={true}
                  >
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </button>

                <ul className="dropdown" role="menu">
                  {PLATFORMS.map((platform) => {
                    const isDetected = platform.id === detectedOS;
                    const Component = platform.href ? "a" : "button";
                    return (
                      <li key={platform.id} role="none">
                        <Component
                          {...(platform.href
                            ? { href: platform.href, download: true }
                            : { type: "button" as const })}
                          role="menuitem"
                          className={isDetected ? "detected" : ""}
                        >
                          <span className="dd-icon">
                            {OS_ICONS[platform.id]}
                          </span>
                          {platform.label}
                          {!platform.href && <span className="soon">Soon</span>}
                          {isDetected && platform.href && <DetectedCheckmark />}
                        </Component>
                      </li>
                    );
                  })}
                </ul>
              </div>

              <div className="cta-note">
                <span className="platform-pill">
                  <svg
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    aria-hidden={true}
                  >
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                  </svg>
                  macOS
                </span>
                <span className="platform-pill">
                  <svg
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    aria-hidden={true}
                  >
                    <path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-12.9-1.801" />
                  </svg>
                  Windows
                </span>
                <span className="platform-pill">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden={true}
                  >
                    <polyline points="4 17 10 11 4 5" />
                    <line x1="12" y1="19" x2="20" y2="19" />
                  </svg>
                  Linux
                </span>
                <span>· Free to start</span>
              </div>
            </div>
          </div>

          {/* Right: macOS window mockup */}
          <div className="mockup-wrap" aria-hidden={true}>
            <div className="window">
              <div className="window-bar">
                <span className="traffic-dot td-red"></span>
                <span className="traffic-dot td-yellow"></span>
                <span className="traffic-dot td-green"></span>
                <span className="window-title">AIGenius</span>
              </div>
              <div className="window-body">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  className="hero-light"
                  src="/images/home-hero-light.png"
                  alt="AIGenius app interface in light mode"
                  loading="eager"
                  decoding="sync"
                />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  className="hero-dark"
                  src="/images/home-hero-dark.png"
                  alt="AIGenius app interface in dark mode"
                  loading="eager"
                  decoding="sync"
                />
              </div>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="footer">
          <span>&#169; {new Date().getFullYear()} Nobox Labs Limited</span>
          <nav className="footer-links" aria-label="Legal">
            <Link href="/docs/privacy-policy">Privacy Policy</Link>
            <Link href="/docs/terms-and-conditions">Terms of Service</Link>
          </nav>
        </footer>
      </div>

      {/* ── About Modal ──────────────────────────────── */}
      {aboutOpen && (
        <div className="about-overlay" onClick={handleBackdropClick}>
          <div className="about-modal" ref={modalRef}>
            {/* Close */}
            <button
              className="about-close"
              onClick={() => setAboutOpen(false)}
              aria-label="Close"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>

            {/* Header */}
            <div className="about-header">
              <div className="about-icon">
                <svg
                  width="22"
                  height="22"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden={true}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
              </div>
              <div>
                <h2 className="about-title">AIGenius</h2>
                <p className="about-version">by Nobox Labs Limited</p>
              </div>
            </div>

            {/* Description — split into two short paragraphs (what it solves,
                then what you actually do with it) instead of one dense block. */}
            <div className="about-desc-group">
              <p className="about-desc">
                AIGenius is one workspace for every major AI model — GPT,
                Claude, Gemini, and more — so you're not paying for separate
                subscriptions or switching tabs to compare answers.
              </p>
              <p className="about-desc">
                Bring your own files and voice, and pay only for the AI calls
                you actually use.
              </p>
            </div>

            <p className="about-tags">
              Multi-model chat · File &amp; voice support · Pay-per-use billing
            </p>

            {/* Legal — small fonts below */}
            <div className="about-legal">
              <Link
                href="/docs/privacy-policy"
                onClick={() => setAboutOpen(false)}
              >
                Privacy Policy
              </Link>
              <span className="about-legal-dot">·</span>
              <Link
                href="/docs/terms-and-conditions"
                onClick={() => setAboutOpen(false)}
              >
                Terms of Service
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
