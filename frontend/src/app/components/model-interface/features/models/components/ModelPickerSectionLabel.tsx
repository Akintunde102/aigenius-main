import React from "react";

type ModelPickerSectionLabelProps = {
  children: React.ReactNode;
  onClick?: () => void;
  title?: string;
  ariaExpanded?: boolean;
  ariaPressed?: boolean;
  className?: string;
};

/**
 * Uppercase section label — matches sidebar project headers and chat list rhythm.
 */
export function ModelPickerSectionLabel({
  children,
  onClick,
  title,
  ariaExpanded,
  ariaPressed,
  className = "",
}: ModelPickerSectionLabelProps) {
  const sharedClassName =
    `sidebar-section-label truncate font-medium uppercase transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-sky-500/40 ${className}`;

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        title={title}
        aria-expanded={ariaExpanded}
        aria-pressed={ariaPressed}
        className={`w-full rounded px-1 py-0.5 text-left ${sharedClassName}`}
        style={{ color: "var(--sidebar-muted-fg)" }}
      >
        {children}
      </button>
    );
  }

  return (
    <span
      className={`block px-1 py-0.5 ${sharedClassName}`}
      style={{ color: "var(--sidebar-muted-fg)" }}
    >
      {children}
    </span>
  );
}

type ModelPickerSectionBlockProps = {
  children: React.ReactNode;
  /** First block in the scroll pane (no extra top padding). */
  isFirst?: boolean;
  className?: string;
};

/** Section header wrapper — same pt/pb rhythm as ChatHistoryList project headers. */
export function ModelPickerSectionBlock({
  children,
  isFirst = false,
  className = "",
}: ModelPickerSectionBlockProps) {
  return (
    <div
      className={`max-w-xl pb-0.5 ${isFirst ? "pt-1" : "pt-2"} ${className}`}
    >
      {children}
    </div>
  );
}

type ModelPickerToggleRowProps = {
  children: React.ReactNode;
};

/** Affordability toggle row — aligns with section labels below. */
export function ModelPickerToggleRow({ children }: ModelPickerToggleRowProps) {
  return (
    <div className="max-w-xl px-1 pb-2 pt-1">
      <div className="flex items-center gap-2">{children}</div>
    </div>
  );
}
