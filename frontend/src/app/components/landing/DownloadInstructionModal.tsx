"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { FREE_CREDITS } from "./constants";
import { Modal } from "./Modal";
import type { Platform } from "./platforms";

export type { Platform } from "./platforms";

interface Step {
  readonly id: string;
  readonly content: ReactNode;
}

interface Instruction {
  readonly intro: string;
  readonly steps: readonly Step[];
  readonly hint?: ReactNode;
}

const CODE_BLOCK = "mt-2 block rounded-lg bg-stone-900/5 px-3 py-2 font-mono text-xs dark:bg-white/10";

/** Intentional replica of the Windows SmartScreen prompt so people recognise what to click. */
function SmartScreenHint() {
  return (
    <div aria-hidden="true" className="select-none rounded bg-[#0078d7] p-4 text-white">
      <p className="text-lg">Windows protected your PC</p>
      <p className="mt-2 text-xs text-white/90">
        Microsoft Defender SmartScreen prevented an unrecognized app from starting. Running this
        app might put your PC at risk.
      </p>
      <span className="relative mt-3 inline-block px-1 text-xs underline">
        More info
        <span className="pointer-events-none absolute -inset-x-2 -inset-y-1.5 rounded-full border-2 border-white" />
      </span>
    </div>
  );
}

/** Record<Platform, …> makes this exhaustive at compile time: adding a platform fails the build here. */
const INSTRUCTIONS: Record<Platform, Instruction> = {
  windows: {
    intro: "AIGenius is new, so Windows SmartScreen may warn you. Here is how to open it:",
    hint: <SmartScreenHint />,
    steps: [
      { id: "info", content: <>Click <strong>More info</strong>.</> },
      { id: "run", content: <>Click <strong>Run anyway</strong>.</> },
    ],
  },
  macos: {
    intro: "As an early-stage app, AIGenius may trigger a macOS Gatekeeper warning. Here is the fix:",
    steps: [
      { id: "move", content: <>Move AIGenius into your <strong>Applications</strong> folder.</> },
      { id: "terminal", content: <>Open <strong>Terminal</strong>.</> },
      {
        id: "command",
        content: (
          <>
            Paste this and press Enter:
            <code className={CODE_BLOCK}>xattr -cr /Applications/AIGenius.app</code>
          </>
        ),
      },
      { id: "launch", content: <>Launch the app as usual.</> },
    ],
  },
  linux: {
    intro: "Here is how to install AIGenius on Debian or Ubuntu:",
    steps: [
      {
        id: "gui",
        content: <>Open the downloaded <code>.deb</code> file in your software center and click <strong>Install</strong>.</>,
      },
      {
        id: "cli",
        content: (
          <>
            Or run this in a terminal:
            <code className={CODE_BLOCK}>sudo apt install ./AIGenius-*.deb</code>
          </>
        ),
      },
    ],
  },
};

interface DownloadInstructionModalProps {
  platform: Platform | null;
  onClose: () => void;
}

export function DownloadInstructionModal({ platform, onClose }: DownloadInstructionModalProps) {
  // Remember the last platform so content stays put while the exit transition plays.
  const lastPlatform = useRef<Platform | null>(null);
  useEffect(() => {
    if (platform) lastPlatform.current = platform;
  }, [platform]);

  const shown = platform ?? lastPlatform.current;
  const instruction = shown ? INSTRUCTIONS[shown] : null;

  return (
    <Modal
      open={platform !== null}
      onClose={onClose}
      title="Your download should begin shortly."
      description={instruction?.intro}
    >
      {instruction?.hint}

      <ol className="list-decimal space-y-2 pl-5 text-sm marker:text-stone-400">
        {instruction?.steps.map((step) => (
          <li key={step.id}>{step.content}</li>
        ))}
      </ol>

      <p className="rounded-xl bg-stone-900/5 p-3.5 text-sm text-stone-600 dark:bg-white/10 dark:text-stone-300">
        <strong>P.S.</strong> You get <strong>{FREE_CREDITS} free credits</strong> when you sign up in the app.
      </p>
    </Modal>
  );
}
