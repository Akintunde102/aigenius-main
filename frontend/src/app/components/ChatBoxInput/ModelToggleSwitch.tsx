import React from "react";

type ModelToggleSwitchProps = {
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
  /** Accessible label, e.g. "Show GPT-5 Mini in quick picks" */
  label: string;
  className?: string;
  /** Smaller track for dense lists (model picker cards). */
  size?: "default" | "sm" | "xs";
  /** Lower-contrast on-state for secondary surfaces. */
  variant?: "default" | "quiet";
};

/**
 * Compact toggle for quick-pick visibility — readable in light and dark surfaces.
 */
export const ModelToggleSwitch: React.FC<ModelToggleSwitchProps> = ({
  checked,
  onChange,
  disabled = false,
  label,
  className = "",
  size = "default",
  variant = "default",
}) => {
  const isSm = size === "sm";
  const isXs = size === "xs";
  const isQuiet = variant === "quiet";

  const trackClass = isXs ? "h-3.5 w-6" : isSm ? "h-4 w-7" : "h-5 w-9";
  const knobClass = isXs ? "h-2 w-2" : isSm ? "h-2.5 w-2.5" : "h-3.5 w-3.5";
  const knobOnX = isXs ? "translate-x-[13px]" : isSm ? "translate-x-[14px]" : "translate-x-[18px]";
  const knobOffX = isXs ? "translate-x-[3px]" : "translate-x-[3px]";

  const checkedClass = isQuiet
    ? "border-transparent bg-[color-mix(in_srgb,var(--modal-fg)_14%,transparent)]"
    : "border-[color:var(--chat-accent)] bg-[color:var(--chat-accent)]";

  const uncheckedClass = isQuiet
    ? "border-transparent bg-[color-mix(in_srgb,var(--modal-fg)_8%,transparent)]"
    : "border-gray-300 bg-gray-200 dark:border-zinc-600 dark:bg-zinc-700";

  const knobClassExtra = isQuiet
    ? "bg-[color-mix(in_srgb,var(--modal-fg)_88%,white)] shadow-none ring-0 opacity-90"
    : "bg-white shadow-sm ring-1 ring-black/5 dark:ring-white/10";

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        onChange();
      }}
      className={`relative inline-flex ${trackClass} shrink-0 items-center rounded-full border transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--chat-accent)] focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50 ${checked ? checkedClass : uncheckedClass} ${className}`}
    >
      <span
        className={`inline-block ${knobClass} rounded-full transition-transform duration-200 ${knobClassExtra} ${checked ? knobOnX : knobOffX}`}
      />
    </button>
  );
};
