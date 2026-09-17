"use client";

import React, { useEffect, useRef } from "react";
import "./home.css"; // Ensure styles are linked

export type Platform = "windows" | "linux" | "macos";

interface DownloadInstructionModalProps {
  platform: Platform | null;
  onClose: () => void;
}

function BonusNotice() {
  return (
    <div className="bonus-notice">
      <span className="bonus-icon" aria-hidden="true">🎁</span>
      <p>
        <strong>P.S.</strong> You get <strong>100 free credits</strong> when you sign up in the app!
      </p>
    </div>
  );
}

export default function DownloadInstructionModal({
  platform,
  onClose,
}: DownloadInstructionModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!platform) return;

    // Focus trap setup
    const focusableElements = modalRef.current?.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements?.[0] as HTMLElement;
    const lastElement = focusableElements?.[focusableElements.length - 1] as HTMLElement;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      
      if (e.key === "Tab") {
        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement?.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement?.focus();
          }
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    
    // Focus the close button or first element on open
    firstElement?.focus();

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [platform, onClose]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) {
      onClose();
    }
  };

  if (!platform) return null;

  return (
    <div
      className="dl-modal-overlay"
      ref={overlayRef}
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="dl-modal-title"
    >
      <div className="dl-modal" ref={modalRef}>
        <button
          className="dl-close-btn"
          ref={closeBtnRef}
          onClick={onClose}
          aria-label="Close instructions"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <h2 id="dl-modal-title" className="dl-modal-title">
          Your download should begin shortly.
        </h2>

        {platform === "windows" && (
          <div className="dl-modal-content">
            <p className="dl-subtitle">
              AIGenius is brand new, so Windows SmartScreen might flag it. Here&apos;s how to open it:
            </p>
            
            <div className="smartscreen-replica" aria-hidden="true">
              <div className="ss-header">Windows protected your PC</div>
              <div className="ss-body">
                <p>Microsoft Defender SmartScreen prevented an unrecognized app from starting. Running this app might put your PC at risk.</p>
                <div className="ss-more-info-wrap">
                  <span className="ss-more-info">More info</span>
                  <div className="ss-circle-highlight" />
                </div>
              </div>
              <div className="ss-footer">
                <button className="ss-btn ss-btn-run" tabIndex={-1}>Run anyway</button>
                <button className="ss-btn ss-btn-dont" tabIndex={-1}>Don&apos;t run</button>
              </div>
            </div>
            
            <ol className="dl-steps">
              <li>Click <strong>More info</strong>.</li>
              <li>Click <strong>Run anyway</strong>.</li>
            </ol>
            
            <BonusNotice />
          </div>
        )}

        {platform === "linux" && (
          <div className="dl-modal-content">
            <p className="dl-subtitle">
              Here&apos;s how to install AIGenius on Linux (Debian/Ubuntu):
            </p>
            <ol className="dl-steps">
              <li>
                Double-click the downloaded <code>.deb</code> file to open it in your Software Center and click <strong>Install</strong>.
              </li>
              <li className="dl-or">OR run this in your terminal:</li>
              <li>
                <code className="dl-code-block">sudo apt install ./AIGenius-*.deb</code>
              </li>
            </ol>
            <BonusNotice />
          </div>
        )}

        {platform === "macos" && (
          <div className="dl-modal-content">
            <p className="dl-subtitle">
              Since we are an early-stage app, macOS Gatekeeper might mistakenly say the app is damaged. Here is the official fix:
            </p>
            <ol className="dl-steps">
              <li>Move the downloaded AIGenius app into your <strong>Applications</strong> folder.</li>
              <li>Open the <strong>Terminal</strong> app.</li>
              <li>Paste this command and press Enter:
                <code className="dl-code-block">xattr -cr /Applications/AIGenius.app</code>
              </li>
              <li>You can now launch the app normally!</li>
            </ol>
            <BonusNotice />
          </div>
        )}
      </div>
    </div>
  );
}
