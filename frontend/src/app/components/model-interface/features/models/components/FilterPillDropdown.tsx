import React, { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
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

type MenuPosition = {
  top: number;
  left: number;
  minWidth: number;
};

const MENU_GAP = 4;
const VIEWPORT_PADDING = 8;
const MENU_Z_INDEX = 120;

function computeMenuPosition(
  triggerEl: HTMLElement,
  menuEl: HTMLElement | null,
): MenuPosition {
  const rect = triggerEl.getBoundingClientRect();
  const minWidth = Math.max(rect.width, 9.5 * 16); // ~9.5rem
  const left = Math.min(
    rect.left,
    window.innerWidth - minWidth - VIEWPORT_PADDING,
  );

  const menuHeight = menuEl?.offsetHeight ?? 0;
  const spaceBelow = window.innerHeight - rect.bottom - VIEWPORT_PADDING;
  const spaceAbove = rect.top - VIEWPORT_PADDING;

  let top: number;
  if (menuHeight > 0 && spaceBelow < menuHeight + MENU_GAP && spaceAbove > spaceBelow) {
    top = rect.top - menuHeight - MENU_GAP;
  } else {
    top = rect.bottom + MENU_GAP;
  }

  return { top, left, minWidth };
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
  const [mounted, setMounted] = useState(false);
  const [menuPosition, setMenuPosition] = useState<MenuPosition | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);
  const listboxId = useId();

  const selected = options.find((opt) => opt.value === value);
  const triggerLabel = selected && selected.value !== "" ? selected.label : placeholder;
  const isActive = forceActive || Boolean(value);

  const close = useCallback(() => setOpen(false), []);

  const updateMenuPosition = useCallback(() => {
    if (!triggerRef.current) return;
    setMenuPosition(computeMenuPosition(triggerRef.current, menuRef.current));
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  useLayoutEffect(() => {
    if (!open) {
      setMenuPosition(null);
      return;
    }
    updateMenuPosition();
    requestAnimationFrame(() => updateMenuPosition());
  }, [open, options.length, updateMenuPosition]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        rootRef.current?.contains(target) ||
        menuRef.current?.contains(target)
      ) {
        return;
      }
      close();
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

  useEffect(() => {
    if (!open) return;
    const onReposition = () => updateMenuPosition();
    window.addEventListener("resize", onReposition);
    window.addEventListener("scroll", onReposition, true);
    return () => {
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, true);
    };
  }, [open, updateMenuPosition]);

  const handleSelect = (next: string) => {
    onChange(next);
    close();
  };

  const menu =
    open && menuPosition && mounted
      ? createPortal(
          <ul
            ref={menuRef}
            id={listboxId}
            role="listbox"
            aria-label={ariaLabel}
            className="app-filter-pill-menu fixed min-w-[9.5rem] max-h-56 overflow-y-auto py-1"
            style={{
              top: menuPosition.top,
              left: menuPosition.left,
              minWidth: menuPosition.minWidth,
              zIndex: MENU_Z_INDEX,
            }}
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
          </ul>,
          document.body,
        )
      : null;

  return (
    <div ref={rootRef} className={cn("relative flex-shrink-0", className)}>
      <button
        ref={triggerRef}
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
      {menu}
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
