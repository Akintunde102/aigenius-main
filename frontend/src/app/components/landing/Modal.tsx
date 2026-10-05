"use client";

import { useEffect, useId, useRef, useState, type ReactNode, type SyntheticEvent } from "react";
import { XIcon } from "./icons";

/** Exit is faster than enter (200ms in, 150ms out): the system responds quickly once you decide. */
const EXIT_MS = 150;

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
}

/**
 * Native <dialog> + showModal(): focus trap, inert background, Escape, top layer and focus restore.
 * The <dialog> is the panel. Its surface uses plain Tailwind stone colours (not the --lp-* variables)
 * so it always resolves in the top layer and always differs from the blurred, dimmed page behind it:
 * light = near-white panel on a dark scrim, dark = lifted stone panel on a near-black scrim.
 * Opacity + transform only, centered origin, scale starts at 0.97 never 0, reduced motion removes it.
 */
export function Modal({ open, onClose, title, description, children }: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [visible, setVisible] = useState(false);
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open) {
      if (!dialog.open) dialog.showModal();
      // Next frame: paint the hidden state first so the transition has a start point.
      const frame = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(frame);
    }

    setVisible(false);
    const timer = window.setTimeout(() => {
      if (dialog.open) dialog.close();
    }, EXIT_MS);
    return () => window.clearTimeout(timer);
  }, [open]);

  const handleCancel = (event: SyntheticEvent<HTMLDialogElement>) => {
    // Escape: route through state so the exit transition runs instead of snapping shut.
    event.preventDefault();
    onClose();
  };

  const duration = visible ? "duration-200" : "duration-150";

  return (
    <dialog
      ref={dialogRef}
      data-visible={visible}
      onCancel={handleCancel}
      onMouseDown={(event) => {
        // Content fills the dialog, so a mousedown whose target is the dialog itself is a backdrop click.
        if (event.target === event.currentTarget) onClose();
      }}
      aria-labelledby={titleId}
      aria-describedby={description ? descId : undefined}
      className={`m-auto max-h-[calc(100%-2rem)] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-2xl bg-stone-50 p-0 text-stone-900 shadow-2xl transition-[opacity,transform] ease-out-strong dark:bg-stone-800 dark:text-stone-100 motion-reduce:transition-none ${duration} ${
        visible ? "scale-100 opacity-100" : "scale-[0.97] opacity-0"
      } backdrop:bg-black/0 backdrop:backdrop-blur-none backdrop:transition-[background-color,backdrop-filter] backdrop:duration-200 backdrop:ease-out-strong data-[visible=true]:backdrop:bg-black/70 data-[visible=true]:backdrop:backdrop-blur-sm motion-reduce:backdrop:transition-none`}
    >
      <div className="px-6 pb-2 pr-14 pt-6">
        <h2 id={titleId} className="text-lg font-medium tracking-tight">
          {title}
        </h2>
        {description && (
          <p id={descId} className="mt-1.5 text-sm leading-relaxed text-stone-500 dark:text-stone-400">
            {description}
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={onClose}
        aria-label="Close dialog"
        className="absolute right-4 top-4 rounded-full p-1.5 text-stone-500 transition-[transform,background-color] duration-150 ease-out-strong hover:bg-stone-900/5 hover:text-stone-900 active:scale-[0.97] dark:text-stone-400 dark:hover:bg-white/10 dark:hover:text-stone-100"
      >
        <XIcon className="h-4 w-4" />
      </button>

      <div className="space-y-4 px-6 pb-6 pt-4">{children}</div>
    </dialog>
  );
}
