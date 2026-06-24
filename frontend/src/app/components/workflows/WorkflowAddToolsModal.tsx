"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Search, Wrench, X } from "lucide-react";
import { categorizeTool, friendlyToolName, type WorkflowTool } from "./workflowsUtils";
import { themeForWorkflowCategory } from "./workflow-studio.theme";
import {
  WorkflowAccentBar,
  WorkflowAddToolsDialogSubtitle,
  workflowModalOverlayClassTools,
  workflowModalPanelClassWide,
} from "./workflow-info";
import { WorkflowToolIcon } from "./WorkflowToolIcon";

type WorkflowAddToolsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  tools: WorkflowTool[];
  onPick: (tool: WorkflowTool) => void;
  title?: string;
};

export function WorkflowAddToolsModal({
  isOpen,
  onClose,
  tools,
  onPick,
  title = "Add a tool",
}: WorkflowAddToolsModalProps) {
  const [mounted, setMounted] = useState(false);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("All");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setSearch("");
      setCategory("All");
    }
  }, [isOpen]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const t of tools) {
      set.add(categorizeTool(t.function.name));
    }
    return ["All", ...Array.from(set).sort()];
  }, [tools]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tools.filter((tool) => {
      const cat = categorizeTool(tool.function.name);
      if (category !== "All" && cat !== category) return false;
      if (!q) return true;
      const hay = `${tool.function.name} ${friendlyToolName(tool.function.name)} ${tool.workflowDescription ?? tool.function.description ?? ""} ${cat}`.toLowerCase();
      return hay.includes(q);
    });
  }, [tools, search, category]);

  const handleClose = useCallback(() => onClose(), [onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, handleClose]);

  if (!mounted || !isOpen) return null;

  const content = (
    <div
      className={workflowModalOverlayClassTools}
      role="dialog"
      aria-modal="true"
      aria-labelledby="workflow-add-tool-title"
      aria-describedby="workflow-add-tool-desc"
      onClick={handleClose}
    >
      <div className={workflowModalPanelClassWide} onClick={(e) => e.stopPropagation()}>
        <WorkflowAccentBar />
        <div className="flex-shrink-0 border-b border-slate-200/90">
          <div className="flex items-start justify-between gap-3 px-4 py-3 sm:px-5">
            <div className="min-w-0">
              <h2 id="workflow-add-tool-title" className="text-lg font-semibold tracking-tight text-slate-900">
                {title}
              </h2>
              <WorkflowAddToolsDialogSubtitle id="workflow-add-tool-desc" />
            </div>
            <button
              type="button"
              className="shrink-0 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/50"
              onClick={handleClose}
              title="Close"
            >
              <X className="h-5 w-5" aria-hidden />
              <span className="sr-only">Close</span>
            </button>
          </div>
        </div>

        <div className="border-b border-slate-200/90 bg-slate-50/40 px-4 py-3 sm:px-5">
          <div className="relative mb-3">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tools…"
              className="w-full rounded-full border border-slate-200/90 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm outline-none transition focus:border-sky-400/80 focus:ring-2 focus:ring-sky-500/25"
            />
          </div>
          <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Filter by category">
            {categories.map((c) => (
              <button
                key={c}
                type="button"
                role="tab"
                aria-selected={category === c}
                onClick={() => setCategory(c)}
                className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/40 ${
                  category === c
                    ? "border-slate-800 bg-slate-900 text-white shadow-sm"
                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <div className="workflow-scroll min-h-0 flex-1 overflow-y-auto bg-slate-50/20 p-4 sm:p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            {filtered.map((tool) => {
              const cat = categorizeTool(tool.function.name);
              const th = themeForWorkflowCategory(cat);
              const key = tool.function.name;
              const desc = tool.workflowDescription?.trim() || tool.function.description?.trim() || "Add to your workflow.";
              const depBlocked =
                tool.workflowAvailability != null && tool.workflowAvailability.ready === false;
              const blockedHint = tool.workflowAvailability?.blockedReason;
              return (
                <div
                  key={key}
                  className={`group my-0 w-full overflow-hidden rounded-xl border border-[rgba(58,71,87,0.12)] bg-white shadow-[0_8px_28px_-18px_rgba(31,42,55,0.28)] transition hover:shadow-[0_12px_32px_-16px_rgba(31,42,55,0.4)] ${th.ringHover} ${depBlocked ? "opacity-90" : ""} hover:ring-2`}
                >
                  <div className="flex items-stretch border-b border-[rgba(58,71,87,0.08)] bg-[rgba(255,255,255,0.92)]">
                    <button
                      type="button"
                      disabled={depBlocked}
                      onClick={() => {
                        if (depBlocked) return;
                        onPick(tool);
                        handleClose();
                      }}
                      className={`flex min-w-0 flex-1 items-center gap-2 px-3 py-2.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/40 focus-visible:ring-inset ${depBlocked ? "cursor-not-allowed opacity-60" : ""}`}
                    >
                      <WorkflowToolIcon
                        tool={tool}
                        className={`h-7 w-7 rounded-md ${th.tileIconBg}`}
                        fallbackClassName={`${th.tileIconBg} ${th.tileIconText}`}
                      />
                      <span className="min-w-0 flex-1 truncate text-sm font-semibold text-[var(--app-ink-800)]">
                        {friendlyToolName(tool.function.name)}
                      </span>
                      <span
                        className={`inline-flex shrink-0 rounded-full border border-[rgba(58,71,87,0.12)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--app-ink-700)] ${th.chip}`}
                      >
                        {cat}
                      </span>
                    </button>
                  </div>
                  <div className="border-b border-[rgba(58,71,87,0.08)] bg-[rgba(246,248,252,0.7)] px-3 py-2">
                    <p className="text-xs leading-5 text-[var(--app-ink-700)]">{desc}</p>
                    {blockedHint ? (
                      <p className="mt-1.5 text-xs font-medium text-amber-800/90">{blockedHint}</p>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
          {filtered.length === 0 && (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200/90 bg-white shadow-inner">
                <Wrench className="h-6 w-6 text-slate-400" aria-hidden />
              </div>
              <p className="text-sm font-medium text-slate-700">No tools match your search</p>
              <p className="max-w-sm text-xs leading-relaxed text-slate-500">
                Try another keyword or switch category. All tools are shown when search is empty.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(content as any, document.body);
}
