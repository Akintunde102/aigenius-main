/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import {
  applyResolvedColorMode,
  LEGACY_THEME_STORAGE_KEY,
  COLOR_MODE_STORAGE_KEY,
} from "@/lib/color-mode";
import "./home.css";

export default function HomePage() {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Dropdown outside click
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEsc);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEsc);
    };
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
              <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden={true}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <span className="nav-logo-text">AIGenius</span>
          </Link>

          <div className="nav-links">
            <Link href="/docs">About</Link>
            <Link href="/login" className="nav-signin">Sign in</Link>
            <button type="button" className="theme-toggle" aria-label="Toggle theme" onClick={toggleTheme}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14" aria-hidden={true}>
                <circle cx="12" cy="12" r="9" /><line x1="12" y1="3" x2="12" y2="21" />
              </svg>
            </button>
          </div>
        </nav>

        {/* Main */}
        <main className="main">
          {/* Left: Copy & CTA */}
          <div className="content">
            <h1 className="headline">Chat with every AI<br />model, in one place.</h1>
            <p className="subtext">
              Switch between GPT, Claude, Gemini and more — without juggling tabs or subscriptions.
              Bring files, voice, and projects. Pay only for what you use.
            </p>

            <div className="cta-wrap">
              <div className={"download-wrap" + (dropdownOpen ? " open" : "")} ref={wrapRef}>
                <button
                  type="button"
                  className="download-btn"
                  aria-expanded={dropdownOpen}
                  aria-haspopup="menu"
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                >
                  Download desktop app
                  <svg className="chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden={true}>
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </button>

                <ul className="dropdown" role="menu">
                  <li role="none">
                    <button type="button" role="menuitem">
                      <span className="dd-icon">
                        <svg viewBox="0 0 24 24" fill="currentColor" stroke="none" aria-hidden={true}>
                          <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                        </svg>
                      </span>
                      macOS
                      <span className="soon">Soon</span>
                    </button>
                  </li>
                  <li role="none">
                    <a href="https://pub-77b8636a163e4485850be3c560433232.r2.dev/AIGenius%20Setup%200.1.0.exe" download role="menuitem">
                      <span className="dd-icon">
                        <svg viewBox="0 0 24 24" fill="currentColor" stroke="none" aria-hidden={true}>
                          <path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-12.9-1.801" />
                        </svg>
                      </span>
                      Windows
                    </a>
                  </li>
                  <hr className="dropdown-divider" role="separator" />
                  <li role="none">
                    <a href="https://pub-77b8636a163e4485850be3c560433232.r2.dev/aigenius-desktop_0.1.0_arm64.deb" download role="menuitem">
                      <span className="dd-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden={true}><polyline points="4 17 10 11 4 5" /><line x1="12" y1="19" x2="20" y2="19" /></svg>
                      </span>
                      Linux
                    </a>
                  </li>
                </ul>
              </div>

              <div className="cta-note">
                <span className="platform-pill">
                  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden={true}>
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                  </svg>
                  macOS
                </span>
                <span className="platform-pill">
                  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden={true}>
                    <path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-12.9-1.801" />
                  </svg>
                  Windows
                </span>
                <span className="platform-pill">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden={true}><polyline points="4 17 10 11 4 5" /><line x1="12" y1="19" x2="20" y2="19" /></svg>
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
    </div>
  );
}
