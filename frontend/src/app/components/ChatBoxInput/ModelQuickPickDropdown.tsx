"use client";

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FiCheck, FiChevronDown, FiPlus } from "react-icons/fi";
import type { Model } from "@/app/components/model-interface/shared/types";
import { getModelDisplayName } from "@/app/components/model-interface/shared/utils";
import {
  QUICK_PICK_DROPDOWN_MAX_WIDTH,
  QUICK_PICK_DROPDOWN_MIN_WIDTH,
} from "@/app/components/model-interface/shared/constants/quickPickModels";

type ModelQuickPickDropdownProps = {
  disabled?: boolean;
  mini?: boolean;
  selectedModel: Model | null;
  quickPickModels: Model[];
  favoritesLoaded: boolean;
  onSelectModel: (model: Model) => void;
  onOpenFullPicker: () => void;
};

type MenuPosition = {
  top: number;
  left: number;
  width: number;
};

const QUICK_PICK_MENU_SCROLL_STYLE = `
  .quick-pick-menu-scroll {
    scrollbar-width: none !important;
    -ms-overflow-style: none !important;
    scrollbar-color: transparent transparent !important;
  }
  .quick-pick-menu-scroll::-webkit-scrollbar {
    width: 0 !important;
    height: 0 !important;
    background: transparent !important;
  }
  .quick-pick-menu-scroll::-webkit-scrollbar-thumb,
  .quick-pick-menu-scroll::-webkit-scrollbar-track {
    background: transparent !important;
  }
`;

const MENU_GAP = 8;
const VIEWPORT_PADDING = 8;

function computeMenuPosition(
  triggerEl: HTMLElement,
  menuEl: HTMLElement | null,
): MenuPosition {
  const rect = triggerEl.getBoundingClientRect();
  const width = Math.min(
    QUICK_PICK_DROPDOWN_MAX_WIDTH,
    Math.max(QUICK_PICK_DROPDOWN_MIN_WIDTH, Math.ceil(rect.width)),
    window.innerWidth - VIEWPORT_PADDING * 2,
  );
  const left = Math.min(
    rect.left,
    window.innerWidth - width - VIEWPORT_PADDING,
  );

  const menuHeight = menuEl?.offsetHeight ?? 0;
  const spaceAbove = rect.top - VIEWPORT_PADDING;
  const spaceBelow = window.innerHeight - rect.bottom - VIEWPORT_PADDING;

  let top: number;
  if (menuHeight > 0 && spaceAbove >= menuHeight + MENU_GAP) {
    top = rect.top - menuHeight - MENU_GAP;
  } else if (spaceBelow >= menuHeight + MENU_GAP) {
    top = rect.bottom + MENU_GAP;
  } else if (spaceAbove > spaceBelow) {
    top = Math.max(VIEWPORT_PADDING, rect.top - menuHeight - MENU_GAP);
  } else {
    top = Math.min(
      window.innerHeight - menuHeight - VIEWPORT_PADDING,
      rect.bottom + MENU_GAP,
    );
  }

  return { top, left, width };
}

export const ModelQuickPickDropdown: React.FC<ModelQuickPickDropdownProps> = ({
  disabled = false,
  mini = false,
  selectedModel,
  quickPickModels,
  favoritesLoaded,
  onSelectModel,
  onOpenFullPicker,
}) => {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [menuPosition, setMenuPosition] = useState<MenuPosition | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const displayModel = useMemo(() => {
    if (!selectedModel) return null;
    return quickPickModels.find((m) => m.id === selectedModel.id) ?? selectedModel;
  }, [selectedModel, quickPickModels]);

  const displayName = displayModel
    ? getModelDisplayName(displayModel)
    : "Select model";

  /** Active model is not listed in the dropdown menu (e.g. toggled off quick picks). */
  const activeOutsideQuickPicks =
    selectedModel != null &&
    !quickPickModels.some((m) => m.id === selectedModel.id);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    setMounted(true);
  }, []);

  const updateMenuPosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    setMenuPosition(computeMenuPosition(trigger, menuRef.current));
  }, []);

  useLayoutEffect(() => {
    if (!open) {
      setMenuPosition(null);
      return;

    }
    const run = () => {
      if (triggerRef.current) {
        setMenuPosition(
          computeMenuPosition(triggerRef.current, menuRef.current),
        );
      }
    };
    run();
    const raf1 = requestAnimationFrame(() => {
      run();
      requestAnimationFrame(run);
    });
    return () => cancelAnimationFrame(raf1);
  }, [open, quickPickModels.length, favoritesLoaded, activeOutsideQuickPicks, selectedModel?.id]);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) {
        return;
      }
      close();
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
      }
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

  const handleToggle = () => {
    if (disabled) return;
    setOpen((prev) => !prev);
  };

  const handleSelect = (model: Model) => {
    onSelectModel(model);
    close();
  };

  const handleAddModels = () => {
    close();
    onOpenFullPicker();
  };

  const menuPanel = open ? (
      <div
        ref={menuRef}
        role="listbox"
        aria-label="Quick pick models"
        className="fixed z-[250] overflow-hidden rounded-xl border shadow-2xl"
        style={{
          top: menuPosition?.top ?? 0,
          left: menuPosition?.left ?? 0,
          width: menuPosition?.width ?? QUICK_PICK_DROPDOWN_MAX_WIDTH,
          visibility: menuPosition ? "visible" : "hidden",
          borderColor: "var(--chat-composer-border)",
          backgroundColor: "var(--chat-composer-bg)",
          color: "var(--sidebar-fg)",
          colorScheme: "dark",
        }}
      >
        <style dangerouslySetInnerHTML={{ __html: QUICK_PICK_MENU_SCROLL_STYLE }} />
        <div className="quick-pick-menu-scroll max-h-[min(50vh,360px)] overflow-y-auto py-1.5">
          {!favoritesLoaded ? (
            <div className="px-3 py-2.5 text-[11px] [color:var(--chat-muted-fg)]">
              Loading models…
            </div>
          ) : activeOutsideQuickPicks && selectedModel ? (
            <>
              <div className="px-3 pt-1 pb-1 text-[9px] font-medium uppercase tracking-wide [color:var(--chat-muted-fg)]">
                Current model
              </div>
              <button
                type="button"
                role="option"
                aria-selected
                onClick={() => handleSelect(selectedModel)}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-[11px] font-medium transition-colors hover:[background-color:color-mix(in_srgb,var(--chat-composer-border)_35%,transparent)]"
              >
                <span className="min-w-0 flex-1 truncate">
                  {getModelDisplayName(selectedModel)}
                </span>
                <FiCheck
                  size={12}
                  className="shrink-0"
                  style={{ color: "var(--chat-accent)" }}
                  aria-hidden
                />
              </button>
              {quickPickModels.length > 0 ? (
                <div
                  className="mx-3 my-1.5 border-t"
                  style={{ borderColor: "var(--chat-composer-border)" }}
                />
              ) : null}
            </>
          ) : null}

          {!favoritesLoaded ? null : quickPickModels.length === 0 && !activeOutsideQuickPicks ? (
            <div className="px-3 py-2.5 text-[11px] [color:var(--chat-muted-fg)]">
              No models in your quick picks yet.
            </div>
          ) : quickPickModels.length > 0 ? (
            <>
              {activeOutsideQuickPicks ? (
                <div className="px-3 pt-0.5 pb-1 text-[9px] font-medium uppercase tracking-wide [color:var(--chat-muted-fg)]">
                  Quick picks
                </div>
              ) : null}
              {quickPickModels.map((model) => {
                const isActive = selectedModel?.id === model.id;
                return (
                  <button
                    key={model.id}
                    type="button"
                    role="option"
                    aria-selected={isActive}
                    onClick={() => handleSelect(model)}
                    className={`flex w-full items-center gap-2 px-3 py-2 text-left text-[11px] transition-colors hover:[background-color:color-mix(in_srgb,var(--chat-composer-border)_35%,transparent)] ${isActive ? "font-medium" : ""}`}
                  >
                    <span className="min-w-0 flex-1 truncate">
                      {getModelDisplayName(model)}
                    </span>
                    {isActive && (
                      <FiCheck
                        size={12}
                        className="shrink-0"
                        style={{ color: "var(--chat-accent)" }}
                        aria-hidden
                      />
                    )}
                  </button>
                );
              })}
            </>
          ) : null}
        </div>

        <div
          className="border-t px-2.5 py-2"
          style={{ borderColor: "var(--chat-composer-border)" }}
        >
          <button
            type="button"
            onClick={handleAddModels}
            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[11px] transition-colors hover:[background-color:color-mix(in_srgb,var(--chat-composer-border)_35%,transparent)] [color:var(--sidebar-muted-fg)] hover:[color:var(--sidebar-fg)]"
          >
            <FiPlus size={12} className="shrink-0" />
            <span>Add models</span>
          </button>
        </div>
      </div>
    ) : null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={handleToggle}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`inline-flex items-center gap-1 rounded-full border text-[13px] transition-colors disabled:cursor-not-allowed disabled:opacity-50 [border-color:var(--chat-composer-border)] [background-color:color-mix(in_srgb,var(--chat-composer-bg)_88%,transparent)] [color:var(--sidebar-muted-fg)] hover:[color:var(--sidebar-fg)] hover:[background-color:var(--chat-composer-bg)] ${mini ? "px-1.5 py-0.5" : "px-2 py-0.5"}`}
        title={selectedModel ? `Model: ${displayName}` : "Select model"}
      >
        <span
          className={`${mini ? "text-[10px]" : "text-xs"} font-medium truncate max-w-32`}
        >
          {displayName}
        </span>
        <FiChevronDown
          size={mini ? 10 : 12}
          className={`shrink-0 opacity-70 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {mounted && menuPanel
        ? createPortal(menuPanel, document.body)
        : null}
    </>
  );
};
