"use client";

import React from "react";
import { FiGift } from "react-icons/fi";
import { SIGNUP_BONUS_CREDITS } from "@/lib/credits";
import { AppModal, AppModalBody, AppModalHeader } from "@/app/components/modals/AppModal";

interface WelcomeSignupCreditsModalProps {
  credits?: number;
  onClose: () => void;
}

export function WelcomeSignupCreditsModal({
  credits = SIGNUP_BONUS_CREDITS,
  onClose,
}: WelcomeSignupCreditsModalProps) {
  return (
    <AppModal
      open
      onClose={onClose}
      size="sm"
      ariaLabelledBy="signup-welcome-title"
    >
      <AppModalHeader
        titleId="signup-welcome-title"
        title="Welcome to AIGenius"
        onClose={onClose}
      />
      <AppModalBody className="space-y-5 text-center">
        <div
          className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl"
          style={{
            background: "color-mix(in srgb, var(--chat-accent) 12%, transparent)",
            border: "1px solid color-mix(in srgb, var(--chat-accent) 25%, var(--modal-border))",
            color: "var(--chat-accent)",
          }}
        >
          <FiGift className="h-7 w-7" aria-hidden />
        </div>

        <p className="text-sm leading-relaxed" style={{ color: "var(--modal-muted-fg)" }}>
          You&apos;re in. We added{" "}
          <span className="font-semibold" style={{ color: "var(--modal-fg)" }}>
            {credits} free credits
          </span>{" "}
          to your wallet so you can try GPT, Claude, Gemini, and more — no subscription required.
        </p>

        <button
          type="button"
          onClick={onClose}
          className="app-modal-btn-primary w-full rounded-xl py-3 text-sm font-semibold"
        >
          Start chatting
        </button>

        <p className="text-xs" style={{ color: "var(--modal-muted-fg)" }}>
          Top up anytime when you need more credits.
        </p>
      </AppModalBody>
    </AppModal>
  );
}
