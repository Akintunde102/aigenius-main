import React from "react";

type ModelToggleSwitchProps = {
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
  /** Accessible label, e.g. "Show GPT-5 Mini in quick picks" */
  label: string;
  className?: string;
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
}) => (
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
    className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--chat-accent)] focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50 ${checked
      ? "border-[color:var(--chat-accent)] bg-[color:var(--chat-accent)]"
      : "border-gray-300 bg-gray-200 dark:border-zinc-600 dark:bg-zinc-700"
      } ${className}`}
  >
    <span
      className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm ring-1 ring-black/5 transition-transform duration-200 dark:ring-white/10 ${checked ? "translate-x-[18px]" : "translate-x-[3px]"}`}
    />
  </button>
);
