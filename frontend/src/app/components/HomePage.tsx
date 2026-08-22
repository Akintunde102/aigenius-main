"use client";`n/* eslint-disable @next/next/no-img-element */

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import "./home.css";

export default function HomePage() {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Theme logic
    const html = document.documentElement;
    const stored = localStorage.getItem("aigenius-theme");
    if (stored === "light" || stored === "dark") {
      html.setAttribute("data-theme", stored);
    } else if (window.matchMedia("(prefers-color-scheme: light)").matches) {
      html.setAttribute("data-theme", "light");
    } else {
      html.setAttribute("data-theme", "dark");
    }

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
    html.setAttribute("data-theme", next);
    localStorage.setItem("aigenius-theme", next);
  };

  return (
    <div className="home-root">
      <div className="page">
        {/* Nav */}
        <nav className="nav">
          <Link href="/" className="nav-logo">
            <span className="nav-logo-mark">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden={true}>
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
              </svg>
            </span>
            <span className="nav-logo-text">AIGenius</span>
          </Link>

          <div className="nav-links">
            <Link href="#">About</Link>
            <Link href="/login" className="nav-signin">Sign in</Link>
            <button type="button" className="theme-toggle" id="theme-toggle" aria-label="Toggle theme" onClick={toggleTheme}>
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
            <h1 className="headline">
              AI models in one workspace.
            </h1>
            <p className="subtext">
              Bring files, voice, and projects. Pay only for what you use.
            </p>

            <div className="cta-wrap">
              <div className={"download-wrap" + (dropdownOpen ? " open" : "")} id="download-wrap" ref={wrapRef}>
                <button type="button" className="download-btn" id="download-btn" aria-expanded={dropdownOpen} aria-haspopup="menu" onClick={() => setDropdownOpen(!dropdownOpen)}>
                  Download desktop app
                  <svg className="chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden={true}>
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </button>

                <ul className="dropdown" role="menu">
                  <li role="none">
                    <button type="button" role="menuitem">
                      <span className="dd-icon">
                        <svg viewBox="0 0 24 24" fill="currentColor" stroke="none" aria-hidden={true}><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" /></svg>
                      </span>
                      macOS
                      <span className="soon">Soon</span>
                    </button>
                  </li>
                  <li role="none">
                    <button type="button" role="menuitem">
                      <span className="dd-icon">
                        <svg viewBox="0 0 24 24" fill="currentColor" stroke="none" aria-hidden={true}><path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-12.9-1.801" /></svg>
                      </span>
                      Windows
                      <span className="soon">Soon</span>
                    </button>
                  </li>
                  <hr className="dropdown-divider" role="separator" />
                  <li role="none">
                    <button type="button" role="menuitem">
                      <span className="dd-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden={true}><polyline points="4 17 10 11 4 5" /><line x1="12" y1="19" x2="20" y2="19" /></svg>
                      </span>
                      Linux
                      <span className="soon">Soon</span>
                    </button>
                  </li>
                </ul>
              </div>

              <div className="cta-note">
                <span className="platform-pill">
                  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden={true}><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" /></svg>
                  macOS
                </span>
                <span className="platform-pill">
                  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden={true}><path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-12.9-1.801" /></svg>
                  Windows
                </span>
                <span className="platform-pill">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden={true}><polyline points="4 17 10 11 4 5" /><line x1="12" y1="19" x2="20" y2="19" /></svg>
                  Linux
                </span>
                <span>• Free to start</span>
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
                <img className="hero-light" src="/images/home-hero-light.png" alt="AIGenius Interface" />
                <img className="hero-dark" src="/images/home-hero-dark.png" alt="AIGenius Interface Dark Mode" />
              </div>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="footer">
          <span>© {new Date().getFullYear()} Nobox Labs Limited</span>
          <nav className="footer-links" aria-label="Legal">
            <Link href="/docs/privacy-policy">Privacy Policy</Link>
            <Link href="/docs/terms-and-conditions">Terms of Service</Link>
          </nav>
        </footer>
      </div>
    </div>
  );
}
