"use client";

import React, { forwardRef, useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  buildWorkflowTemplateCompletionItems,
  filterTemplateCompletionsByPrefix,
} from "./workflowChainingPaths.utils";
import type { WorkflowStepDraft, WorkflowTool } from "./workflowsUtils";
import { cn } from "@/lib/utils";

type WorkflowTemplateAutocompleteTextareaProps = {
  value: string;
  onChange: (next: string) => void;
  previousSteps: WorkflowStepDraft[];
  toolLibrary: WorkflowTool[];
  className?: string;
  rows?: number;
  id?: string;
  "aria-labelledby"?: string;
  placeholder?: string;
};

export const WorkflowTemplateAutocompleteTextarea = forwardRef<HTMLTextAreaElement, WorkflowTemplateAutocompleteTextareaProps>(
  function WorkflowTemplateAutocompleteTextarea(
    { value, onChange, previousSteps, toolLibrary, className, rows = 4, id, "aria-labelledby": ariaLabelledBy, placeholder },
    forwardedRef,
  ) {
    const innerRef = useRef<HTMLTextAreaElement | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const [open, setOpen] = useState(false);
    const [anchorIdx, setAnchorIdx] = useState<number | null>(null);
    const [filterInner, setFilterInner] = useState("");
    const [highlight, setHighlight] = useState(0);

    const attachTextareaRef = useCallback(
      (el: HTMLTextAreaElement | null) => {
        innerRef.current = el;
        if (typeof forwardedRef === "function") {
          forwardedRef(el);
        } else if (forwardedRef != null) {
          (forwardedRef as React.MutableRefObject<HTMLTextAreaElement | null>).current = el;
        }
      },
      [forwardedRef],
    );

    const allItems = useMemo(
      () => buildWorkflowTemplateCompletionItems(previousSteps, toolLibrary),
      [previousSteps, toolLibrary],
    );

    const filtered = useMemo(
      () => filterTemplateCompletionsByPrefix(allItems, filterInner),
      [allItems, filterInner],
    );

    const syncMenuFromCaret = useCallback(() => {
      const el = innerRef.current;
      if (!el) return;
      const v = el.value;
      const sel = el.selectionStart ?? v.length;
      const before = v.slice(0, sel);
      const openIdx = before.lastIndexOf("{{");
      if (openIdx < 0) {
        setOpen(false);
        setAnchorIdx(null);
        return;
      }
      const afterOpen = before.slice(openIdx + 2);
      if (afterOpen.includes("}}")) {
        setOpen(false);
        setAnchorIdx(null);
        return;
      }
      setAnchorIdx(openIdx);
      setFilterInner(afterOpen);
      setOpen(true);
      setHighlight(0);
    }, []);

    useLayoutEffect(() => {
      if (!open) return;
      const onDoc = (e: MouseEvent) => {
        if (menuRef.current?.contains(e.target as Node)) return;
        if (innerRef.current?.contains(e.target as Node)) return;
        setOpen(false);
      };
      document.addEventListener("mousedown", onDoc);
      return () => document.removeEventListener("mousedown", onDoc);
    }, [open]);

    const applyPick = useCallback(
      (insertText: string) => {
        const el = innerRef.current;
        if (!el || anchorIdx === null) return;
        const v = el.value;
        const sel = el.selectionStart ?? v.length;
        const next = `${v.slice(0, anchorIdx)}${insertText}${v.slice(sel)}`;
        onChange(next);
        setOpen(false);
        setAnchorIdx(null);
        const pos = anchorIdx + insertText.length;
        requestAnimationFrame(() => {
          el.focus();
          el.setSelectionRange(pos, pos);
        });
      },
      [anchorIdx, onChange],
    );

    const onKeyDown = useCallback(
      (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (!open || filtered.length === 0) return;
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setHighlight((h) => Math.min(filtered.length - 1, h + 1));
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          setHighlight((h) => Math.max(0, h - 1));
        } else if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          const item = filtered[highlight];
          if (item) applyPick(item.insertText);
        } else if (e.key === "Escape") {
          e.preventDefault();
          setOpen(false);
        }
      },
      [open, filtered, highlight, applyPick],
    );

    return (
      <div className="relative">
        <textarea
          ref={attachTextareaRef}
          id={id}
          aria-labelledby={ariaLabelledBy}
          value={value}
          rows={rows}
          placeholder={placeholder}
          onChange={(e) => {
            onChange(e.target.value);
            queueMicrotask(syncMenuFromCaret);
          }}
          onSelect={syncMenuFromCaret}
          onKeyUp={syncMenuFromCaret}
          onClick={syncMenuFromCaret}
          onKeyDown={onKeyDown}
          spellCheck={false}
          className={cn(
            "block min-h-[100px] w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-teal-400/80 focus:ring-2 focus:ring-teal-500/20 ring-offset-0 focus-visible:ring-offset-0 focus-visible:ring-teal-500/30 focus-visible:border-teal-400/70",
            className,
          )}
        />
        {open && filtered.length > 0 ? (
          <div
            ref={menuRef}
            role="listbox"
            aria-label="Template completions"
            className="absolute left-0 right-0 z-[90] mt-1 max-h-52 overflow-y-auto rounded-xl border border-slate-200/90 bg-white py-1 shadow-lg ring-1 ring-slate-900/5"
          >
            {filtered.map((item, i) => (
              <button
                key={item.insertText}
                type="button"
                role="option"
                aria-selected={i === highlight}
                className={cn(
                  "flex w-full flex-col gap-0.5 px-3 py-2 text-left text-[11px] transition",
                  i === highlight ? "bg-teal-50 text-teal-950" : "text-slate-800 hover:bg-slate-50",
                )}
                onMouseEnter={() => setHighlight(i)}
                onMouseDown={(ev) => ev.preventDefault()}
                onClick={() => applyPick(item.insertText)}
              >
                <span className="font-mono text-[10px] text-teal-900">{item.label}</span>
                {item.detail ? <span className="text-[10px] text-slate-500">{item.detail}</span> : null}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    );
  },
);
