"use client";

import React from "react";
import ReactDOM from "react-dom";
import { FiGift, FiX } from "react-icons/fi";
import { SIGNUP_BONUS_CREDITS } from "@/lib/credits";

interface WelcomeSignupCreditsModalProps {
  credits?: number;
  onClose: () => void;
}

export function WelcomeSignupCreditsModal({
  credits = SIGNUP_BONUS_CREDITS,
  onClose,
}: WelcomeSignupCreditsModalProps) {
  return ReactDOM.createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="signup-welcome-title"
    >
      <div
        className="relative w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-zinc-950 shadow-2xl shadow-black/60"
      >
        <div
          aria-hidden
          className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/70 to-transparent"
        />
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-zinc-400 transition hover:bg-white/5 hover:text-white"
          aria-label="Close welcome message"
        >
          <FiX className="h-5 w-5" />
        </button>

        <div className="space-y-5 p-8 pt-10 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-500/10 ring-1 ring-cyan-400/30">
            <FiGift className="h-7 w-7 text-cyan-300" aria-hidden />
          </div>

          <div className="space-y-2">
            <h2
              id="signup-welcome-title"
              className="text-2xl font-semibold tracking-tight text-white"
            >
              Welcome to AIGenius
            </h2>
            <p className="text-sm leading-relaxed text-zinc-400">
              You&apos;re in. We added{" "}
              <span className="font-semibold text-cyan-200">
                {credits} free credits
              </span>{" "}
              to your wallet so you can try GPT, Claude, Gemini, and more — no
              subscription required.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-xl bg-cyan-500 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-cyan-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400"
          >
            Start chatting
          </button>

          <p className="text-xs text-zinc-500">
            Top up anytime when you need more credits.
          </p>
        </div>
      </div>
    </div>,
    document.body,
  );
}
