import React, { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FiChevronDown, FiSearch, FiX } from "react-icons/fi";
import { cn } from "@/lib/utils";
import { MODAL_POPOVER_Z_INDEX } from "@/lib/utils/modal-z-index";

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
  labelClassName?: string;
  /** When true, renders a search bar inside the opened dropdown menu */
  searchable?: boolean;
  searchPlaceholder?: string;
}

type MenuPosition = {
  top: number;
  left: number;
  minWidth: number;
};

const MENU_GAP = 4;
const VIEWPORT_PADDING = 8;
const MENU_Z_INDEX = MODAL_POPOVER_Z_INDEX;

function computeMenuPosition(
  triggerEl: HTMLElement,
  menuEl: HTMLElement | null,
  searchable = false,
): MenuPosition {
  const rect = triggerEl.getBoundingClientRect();
  const minWidth = Math.max(rect.width, searchable ? 12 * 16 : 9.5 * 16);
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
  labelClassName,
  searchable = false,
  searchPlaceholder,
}: FilterPillDropdownProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [menuPosition, setMenuPosition] = useState<MenuPosition | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listboxId = useId();

  const selected = options.find((opt) => opt.value === value);
  const triggerLabel = selected && selected.value !== "" ? selected.label : placeholder;
  const isActive = forceActive || (Boolean(value) && value !== "default");

  const close = useCallback(() => setOpen(false), []);

  const updateMenuPosition = useCallback(() => {
    if (!triggerRef.current) return;
    setMenuPosition(computeMenuPosition(triggerRef.current, menuRef.current, searchable));
  }, [searchable]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (open) {
      if (searchable) {
        const timer = setTimeout(() => searchInputRef.current?.focus(), 30);
        return () => clearTimeout(timer);
      }
    } else {
      setSearchQuery("");
    }
  }, [open, searchable]);

  const filteredOptions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!searchable || !q) return options;
    return options.filter((opt) => {
      if (!opt.value) return false;
      return (
        opt.label.toLowerCase().includes(q) ||
        opt.value.toLowerCase().includes(q)
      );
    });
  }, [options, searchable, searchQuery]);

  useLayoutEffect(() => {
    if (!open) {
      setMenuPosition(null);
      return;
    }
    updateMenuPosition();
    requestAnimationFrame(() => updateMenuPosition());
  }, [open, filteredOptions.length, updateMenuPosition]);

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
    const onReposition = () => updateMenuPosition();

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", onReposition);
    window.addEventListener("scroll", onReposition, true);

    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, true);
    };
  }, [open, close, updateMenuPosition]);

  const handleSelect = (next: string) => {
    onChange(next);
    close();
  };

  const menu =
    open && menuPosition && mounted
      ? createPortal(
          <div
            ref={menuRef}
            className="app-filter-pill-menu fixed min-w-[9.5rem] flex flex-col p-1"
            style={{
              top: menuPosition.top,
              left: menuPosition.left,
              minWidth: menuPosition.minWidth,
              zIndex: MENU_Z_INDEX,
            }}
          >
            {searchable && (
              <div className="p-1 pb-1.5 border-b border-[var(--modal-border)] mb-1 flex-shrink-0">
                <div className="relative flex items-center">
                  <FiSearch
                    size={12}
                    className="absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--sidebar-muted-fg)]"
                    aria-hidden
                  />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Escape") {
                        e.stopPropagation();
                        if (searchQuery) {
                          setSearchQuery("");
                        } else {
                          close();
                        }
                      } else if (e.key === "Enter" && filteredOptions.length > 0) {
                        e.preventDefault();
                        handleSelect(filteredOptions[0].value);
                      }
                    }}
                    placeholder={searchPlaceholder || "Search..."}
                    aria-label={searchPlaceholder || "Search options"}
                    className="app-modal-input rounded-md pl-6 pr-5 text-xs h-7 w-full transition-colors"
                    style={{
                      background: "var(--sidebar-search-bg)",
                      borderColor: "var(--sidebar-border)",
                      color: "var(--sidebar-search-fg)",
                    }}
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[var(--sidebar-muted-fg)] hover:text-[var(--sidebar-fg)] transition-colors p-0.5"
                      aria-label="Clear search"
                    >
                      <FiX size={11} />
                    </button>
                  )}
                </div>
              </div>
            )}
            <ul
              id={listboxId}
              role="listbox"
              aria-label={ariaLabel}
              className="max-h-52 overflow-y-auto space-y-0.5 [scrollbar-width:thin]"
            >
              {filteredOptions.length > 0 ? (
                filteredOptions.map((opt) => {
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
                })
              ) : (
                <li className="px-2.5 py-2 text-xs text-[var(--sidebar-muted-fg)] text-center">
                  No matching options
                </li>
              )}
            </ul>
          </div>,
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
        <span className={cn(labelClassName || "max-w-[7.5rem]", "truncate")}>{triggerLabel}</span>
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
