import React, { useCallback, useEffect, useId, useRef, useState } from "react";
import { FiChevronDown } from "react-icons/fi";
import { cn } from "@/lib/utils";

export interface FilterPillOption {
  value: string;
  label: string;
}

interface FilterPillDropdownProps {
  value: string;
  options: FilterPillOption[];
  onChange: (value: string) => void;
  placeholder: string;
  ariaLabel: string;
  /** When true, trigger uses active pill styling even if value is empty. */
  forceActive?: boolean;
  className?: string;
}

export const FilterPillDropdown = React.memo(function FilterPillDropdown({
  value,
  options,
  onChange,
  placeholder,
  ariaLabel,
  forceActive = false,
  className,
}: FilterPillDropdownProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();

  const selected = options.find((opt) => opt.value === value);
  const triggerLabel = selected && selected.value !== "" ? selected.label : placeholder;
  const isActive = forceActive || Boolean(value);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) close();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, close]);

  const handleSelect = (next: string) => {
    onChange(next);
    close();
  };

  return (
    <div ref={rootRef} className={cn("relative flex-shrink-0", className)}>
      <button
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          "app-filter-pill inline-flex items-center gap-1",
          isActive && "app-filter-pill--active",
        )}
      >
        <span className="max-w-[7.5rem] truncate">{triggerLabel}</span>
        <FiChevronDown
          size={12}
          className={cn(
            "shrink-0 opacity-70 transition-transform duration-150",
            open && "rotate-180",
          )}
          aria-hidden
        />
      </button>

      {open ? (
        <ul
          id={listboxId}
          role="listbox"
          aria-label={ariaLabel}
          className="app-filter-pill-menu absolute left-0 top-[calc(100%+0.25rem)] z-50 min-w-[9.5rem] max-h-56 overflow-y-auto py-1"
        >
          {options.map((opt) => {
            const selectedOption = opt.value === value;
            return (
              <li key={opt.value || "__all__"} role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={selectedOption}
                  onClick={() => handleSelect(opt.value)}
                  className={cn(
                    "app-filter-pill-menu__item w-full text-left",
                    selectedOption && "app-filter-pill-menu__item--selected",
                  )}
                >
                  {opt.label}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
});

interface FilterPillIconButtonProps {
  active?: boolean;
  onClick: () => void;
  title: string;
  ariaLabel: string;
  activeClassName?: string;
  children: React.ReactNode;
}

export const FilterPillIconButton = React.memo(function FilterPillIconButton({
  active = false,
  onClick,
  title,
  ariaLabel,
  activeClassName,
  children,
}: FilterPillIconButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={ariaLabel}
      aria-pressed={active}
      className={cn(
        "app-filter-pill app-filter-pill--icon",
        active && (activeClassName ?? "app-filter-pill--active"),
      )}
    >
      {children}
    </button>
  );
});
