"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Braces } from "lucide-react";
import {
  createChainedLastToken,
  createChainedStepResultToken,
  getChainingPathsForWorkflowTool,
} from "./workflowChainingPaths.utils";
import {
  createLastResultToken,
  createResultToken,
  friendlyToolName,
  insertTokenAtCaret,
  type WorkflowStepDraft,
  type WorkflowTool,
} from "./workflowsUtils";
import { cn } from "@/lib/utils";

export { insertTokenAtCaret } from "./workflowsUtils";

type WorkflowDynamicValueInserterProps = {
  inputRef: React.RefObject<HTMLTextAreaElement | HTMLInputElement | null>;
  value: string;
  onInsert: (next: string) => void;
  previousSteps: WorkflowStepDraft[];
  /** Tool definitions (from GET /tools) — used to suggest `{{ last.<path> }}` / step subpaths. */
  toolLibrary: WorkflowTool[];
  compact?: boolean;
  className?: string;
};

export function WorkflowDynamicValueInserter({
  inputRef,
  value,
  onInsert,
  previousSteps,
  toolLibrary,
  compact = false,
  className,
}: WorkflowDynamicValueInserterProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});

  const toolByName = useMemo(() => new Map(toolLibrary.map((t) => [t.function.name, t])), [toolLibrary]);

  const immediatePrevious = previousSteps.length > 0 ? previousSteps[previousSteps.length - 1] : undefined;
  const earlierStepsOnly = previousSteps.length > 1 ? previousSteps.slice(0, -1) : [];
  const pathsForLast = useMemo(() => {
    if (!immediatePrevious) return [];
    return getChainingPathsForWorkflowTool(toolByName.get(immediatePrevious.toolName));
  }, [immediatePrevious, toolByName]);

  useEffect(() => {
    setMounted(true);
  }, []);

  const updatePosition = useCallback(() => {
    if (!rootRef.current) return;
    const rect = rootRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceLeft = rect.left;

    const style: React.CSSProperties = {
      position: "fixed",
      zIndex: 9999,
    };

    if (spaceBelow < 300 && rect.top > 300) {
      style.bottom = `${window.innerHeight - rect.top + 6}px`;
    } else {
      style.top = `${rect.bottom + 6}px`;
    }

    if (spaceLeft < 320) {
      style.left = `${Math.max(12, rect.left)}px`;
    } else {
      style.right = `${Math.max(12, window.innerWidth - rect.right)}px`;
    }

    setMenuStyle(style);
  }, []);

  useEffect(() => {
    if (!open) return;
    updatePosition();

    const onDoc = (e: MouseEvent) => {
      if (
        rootRef.current && !rootRef.current.contains(e.target as Node) &&
        menuRef.current && !menuRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };

    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    document.addEventListener("mousedown", onDoc);

    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
      document.removeEventListener("mousedown", onDoc);
    };
  }, [open, updatePosition]);

  const handlePick = useCallback(
    (token: string) => {
      insertTokenAtCaret(inputRef.current, value, token, onInsert);
      setOpen(false);
    },
    [inputRef, value, onInsert],
  );

  const canUseLast = previousSteps.length > 0;

  const dropdownMenu = open && mounted ? (
    createPortal(
      <div
        ref={menuRef}
        style={menuStyle}
        className="w-[min(20rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-slate-200/90 bg-white py-2 shadow-2xl ring-1 ring-slate-900/5 dark:border-slate-700 dark:bg-slate-900 dark:shadow-[0_12px_40px_-8px_rgba(0,0,0,0.8)] dark:ring-0"
        role="dialog"
        aria-label="Insert dynamic value"
      >
        <p className="border-b border-slate-100 px-3 pb-2 text-[10px] leading-snug text-slate-500 dark:border-slate-800 dark:text-slate-400">
          Resolved at run time. Pick a field path when the next step only needs part of the JSON (e.g.{" "}
          <code className="rounded bg-slate-100 px-1 font-mono text-[9px] text-slate-700 dark:bg-slate-800 dark:text-slate-300">content</code> after{" "}
          <code className="rounded bg-slate-100 px-1 font-mono text-[9px] text-slate-700 dark:bg-slate-800 dark:text-slate-300">call_model</code>).
        </p>
        <div className="workflow-scroll-light max-h-[min(70vh,22rem)] overflow-y-auto px-1 pt-1">
          <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">Previous step</p>
          <button
            type="button"
            disabled={!canUseLast}
            title={canUseLast ? undefined : "Add another step before this one first."}
            onClick={() => handlePick(createLastResultToken())}
            className="flex w-full flex-col gap-0.5 px-2.5 py-2 text-left hover:bg-teal-50 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-teal-950/60"
          >
            <span className="font-mono text-[10px] text-teal-900 dark:text-teal-300">{"{{ last }}"}</span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400">Full JSON string from the step right before this one</span>
          </button>
          {pathsForLast.map((p) => (
            <button
              key={`last-${p}`}
              type="button"
              disabled={!canUseLast}
              onClick={() => handlePick(createChainedLastToken(p))}
              className="flex w-full flex-col gap-0.5 border-t border-slate-50 px-2.5 py-1.5 text-left hover:bg-teal-50/60 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-800/60 dark:hover:bg-teal-950/40"
            >
              <span className="font-mono text-[10px] text-teal-800 dark:text-teal-300">{createChainedLastToken(p)}</span>
              <span className="text-[9px] text-slate-500 dark:text-slate-400">Field: {p}</span>
            </button>
          ))}

          {earlierStepsOnly.length > 0 ? (
            <>
              <p className="mt-2 px-2 pb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">Earlier steps</p>
              <ul className="pb-1">
                {earlierStepsOnly.map((s) => {
                  const paths = getChainingPathsForWorkflowTool(toolByName.get(s.toolName));
                  return (
                    <li key={s.localId} className="border-t border-slate-100 first:border-t-0 dark:border-slate-800">
                      <button
                        type="button"
                        onClick={() => handlePick(createResultToken(s.stepId))}
                        className="flex w-full flex-col gap-0.5 px-2.5 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800"
                      >
                        <span className="text-xs font-medium text-slate-800 dark:text-slate-200">{s.label?.trim() || friendlyToolName(s.toolName)}</span>
                        <span className="break-all font-mono text-[9px] text-slate-500 dark:text-slate-400">{createResultToken(s.stepId)}</span>
                      </button>
                      {paths.map((p) => (
                        <button
                          key={`${s.localId}-${p}`}
                          type="button"
                          onClick={() => handlePick(createChainedStepResultToken(s.stepId, p))}
                          className="flex w-full flex-col gap-0.5 px-3 py-1.5 pl-4 text-left hover:bg-slate-50/80 dark:hover:bg-slate-800/60"
                        >
                          <span className="font-mono text-[9px] text-slate-600 dark:text-slate-300">{createChainedStepResultToken(s.stepId, p)}</span>
                          <span className="text-[9px] text-slate-400 dark:text-slate-500">{p}</span>
                        </button>
                      ))}
                    </li>
                  );
                })}
              </ul>
            </>
          ) : null}
        </div>
      </div>,
      document.body,
    )
  ) : null;

  return (
    <div ref={rootRef} className={cn("relative shrink-0", className)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="dialog"
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border border-teal-200/90 bg-white px-2.5 py-1 text-[11px] font-medium text-teal-900 shadow-sm transition hover:border-teal-300 hover:bg-teal-50/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/35 dark:border-teal-800/80 dark:bg-slate-900 dark:text-teal-200 dark:hover:border-teal-700 dark:hover:bg-slate-800",
          compact && "px-2 py-0.5 text-[10px]",
        )}
      >
        <Braces className="h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden />
        {compact ? "Insert" : "Insert value"}
      </button>
      {dropdownMenu}
    </div>
  );
}
