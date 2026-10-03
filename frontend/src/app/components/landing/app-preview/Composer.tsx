"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { ArrowUpIcon, ChevronDownIcon, PaperclipIcon, UserIcon } from "./appIcons";
import { MODELS, type ModelName } from "./data";
import { APP } from "./theme";

const EASE = [0.23, 1, 0.32, 1] as const;

interface ComposerProps {
  draft: string;
  model: ModelName;
  disabled: boolean;
  onDraft: (value: string) => void;
  onModel: (model: ModelName) => void;
  onSend: () => void;
  onNotice: (text: string) => void;
}

export function Composer({ draft, model, disabled, onDraft, onModel, onSend, onNotice }: ComposerProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const canSend = draft.trim().length > 0 && !disabled;

  useEffect(() => {
    if (!menuOpen) return;
    const handlePointer = (event: MouseEvent) => {
      if (menuRef.current && event.target instanceof Node && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };
    const handleKey = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", handlePointer);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handlePointer);
      document.removeEventListener("keydown", handleKey);
    };
  }, [menuOpen]);

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (canSend) onSend();
    }
  };

  return (
    <div className="px-5 pb-5 sm:px-12">
      <div className={`mx-auto max-w-3xl rounded-3xl border p-3 ${APP.panel} ${APP.line}`}>
        <div className="flex items-start gap-3">
          <label htmlFor="preview-composer" className="sr-only">
            Message
          </label>
          <textarea
            id="preview-composer"
            rows={1}
            value={draft}
            onChange={(event) => onDraft(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type..."
            className="min-h-10 flex-1 resize-none border-0 bg-transparent px-3 py-2 text-lg outline-none ring-0 focus:border-0 focus:outline-none focus:ring-0 focus-visible:ring-0 focus-visible:outline-none placeholder:text-black/40 dark:placeholder:text-white/40"
          />
          <button
            type="button"
            onClick={onSend}
            disabled={!canSend}
            aria-label="Send message"
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-[transform,background-color] duration-150 ease-out-strong active:scale-[0.94] ${
              canSend ? APP.sendActive : APP.send
            }`}
          >
            <ArrowUpIcon className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-1 flex items-center gap-2 px-1">
          <div ref={menuRef} className="relative">
            <button
              type="button"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((open) => !open)}
              className={`flex items-center gap-0.5 rounded-md px-1.5 py-1 text-xs font-medium transition-colors duration-150 ${APP.muted} ${APP.hover} hover:text-inherit`}
            >
              {model}
              <ChevronDownIcon className="h-3 w-3" />
            </button>
            <AnimatePresence>
              {menuOpen && (
                <motion.ul
                  role="menu"
                  initial={{ opacity: 0, y: 6, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 6, scale: 0.97 }}
                  transition={{ duration: 0.15, ease: EASE }}
                  className={`absolute bottom-full left-0 z-20 mb-2 w-40 origin-bottom-left rounded-xl border p-1 shadow-xl ${APP.popover} ${APP.line}`}
                >
                  {MODELS.map((name) => (
                    <li key={name} role="none">
                      <button
                        type="button"
                        role="menuitemradio"
                        aria-checked={name === model}
                        onClick={() => {
                          onModel(name);
                          setMenuOpen(false);
                        }}
                        className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm ${APP.hover} ${
                          name === model ? APP.active : ""
                        }`}
                      >
                        {name}
                        {name === model && <span className="h-1.5 w-1.5 rounded-full bg-sky-500" />}
                      </button>
                    </li>
                  ))}
                </motion.ul>
              )}
            </AnimatePresence>
          </div>

          <button
            type="button"
            aria-label="Choose a persona"
            onClick={() => onNotice("Personas are part of the full app.")}
            className={`flex h-7 w-9 items-center justify-center rounded-full ${APP.muted} ${APP.hover}`}
          >
            <UserIcon className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            aria-label="Attach a file"
            onClick={() => onNotice("Attaching files works in the full app.")}
            className={`flex h-7 w-7 items-center justify-center rounded-full ${APP.muted} ${APP.hover}`}
          >
            <PaperclipIcon className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
