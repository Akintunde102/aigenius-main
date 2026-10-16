"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Wrench } from "lucide-react";
import { AppModal, AppModalBody, AppModalHeader, AppModalSearchRow } from "@/app/components/modals/AppModal";
import { categorizeTool, friendlyToolName, type WorkflowTool } from "./workflowsUtils";
import { themeForWorkflowCategory } from "./workflow-studio.theme";
import {
  WorkflowAccentBar,
  WorkflowAddToolsDialogSubtitle,
} from "./workflow-info";
import { WorkflowToolIcon } from "./WorkflowToolIcon";
import { useLanguage } from "@/lib/providers/LanguageProvider";

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
  title,
}: WorkflowAddToolsModalProps) {
  const { t } = useLanguage();
  const dialogTitle = title ?? t("workflows.addToolTitle", "Add a tool");
  const categoryAllLabel = t("workflows.categoryAll", "All");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>(categoryAllLabel);

  useEffect(() => {
    if (!isOpen) {
      setSearch("");
      setCategory(categoryAllLabel);
    }
  }, [isOpen, categoryAllLabel]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const t of tools) {
      set.add(categorizeTool(t.function.name));
    }
    return [categoryAllLabel, ...Array.from(set).sort()];
  }, [tools, categoryAllLabel]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tools.filter((tool) => {
      const cat = categorizeTool(tool.function.name);
      if (category !== categoryAllLabel && cat !== category) return false;
      if (!q) return true;
      const hay = `${tool.function.name} ${friendlyToolName(tool.function.name)} ${tool.workflowDescription ?? tool.function.description ?? ""} ${cat}`.toLowerCase();
      return hay.includes(q);
    });
  }, [tools, search, category, categoryAllLabel]);

  const handleClose = useCallback(() => onClose(), [onClose]);

  return (
    <AppModal
      open={isOpen}
      onClose={handleClose}
      size="xl"
      className="z-[100]"
      ariaLabelledBy="workflow-add-tool-title"
      panelClassName="flex max-h-[min(85vh,900px)] flex-col overflow-hidden p-0"
    >
      <WorkflowAccentBar />
      <AppModalHeader
        titleId="workflow-add-tool-title"
        title={dialogTitle}
        subtitle={<WorkflowAddToolsDialogSubtitle id="workflow-add-tool-desc" />}
        onClose={handleClose}
      />
      <div
        className="shrink-0 border-b px-4 py-3 sm:px-5"
        style={{ borderColor: "var(--modal-border)", background: "var(--modal-bg-muted)" }}
      >
        <AppModalSearchRow
          value={search}
          onChange={setSearch}
          placeholder={t("workflows.searchToolsPlaceholder", "Search tools…")}
        />
          <div className="flex flex-wrap gap-1.5" role="tablist" aria-label={t("workflows.filterCategoryAria", "Filter by category")}>
            {categories.map((c) => (
              <button
                key={c}
                type="button"
                role="tab"
                aria-selected={category === c}
                onClick={() => setCategory(c)}
                className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/40 ${
                  category === c
                    ? "border-slate-800 bg-slate-900 text-white shadow-sm dark:border-slate-600 dark:bg-slate-700"
                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

      <AppModalBody className="workflow-scroll min-h-0 flex-1 overflow-y-auto !pt-4">
          <div className="grid gap-3 sm:grid-cols-2">
            {filtered.map((tool) => {
              const cat = categorizeTool(tool.function.name);
              const th = themeForWorkflowCategory(cat);
              const key = tool.function.name;
              const desc =
                tool.workflowDescription?.trim() ||
                tool.function.description?.trim() ||
                t("workflows.addToWorkflowFallback", "Add to your workflow.");
              const depBlocked =
                tool.workflowAvailability != null && tool.workflowAvailability.ready === false;
              const blockedHint = tool.workflowAvailability?.blockedReason;
              return (
                <div
                  key={key}
                  className={`group my-0 w-full overflow-hidden rounded-xl border border-[rgba(58,71,87,0.12)] bg-white shadow-[0_8px_28px_-18px_rgba(31,42,55,0.28)] transition hover:shadow-[0_12px_32px_-16px_rgba(31,42,55,0.4)] ${th.ringHover} ${depBlocked ? "opacity-90" : ""} hover:ring-2 dark:border-slate-800/90 dark:bg-[#18191c]`}
                >
                  <div className="flex items-stretch border-b border-[rgba(58,71,87,0.08)] bg-[rgba(255,255,255,0.92)] dark:border-slate-800/80 dark:bg-[#1e2024]">
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
                      <span className="min-w-0 flex-1 truncate text-sm font-semibold text-[var(--app-ink-800)] dark:text-slate-100">
                        {friendlyToolName(tool.function.name)}
                      </span>
                      <span
                        className={`inline-flex shrink-0 rounded-full border border-[rgba(58,71,87,0.12)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--app-ink-700)] dark:border-slate-700 dark:text-slate-300 ${th.chip}`}
                      >
                        {cat}
                      </span>
                    </button>
                  </div>
                  <div className="border-b border-[rgba(58,71,87,0.08)] bg-[rgba(246,248,252,0.7)] px-3 py-2 dark:border-slate-800/80 dark:bg-[#141518]">
                    <p className="text-xs leading-5 text-[var(--app-ink-700)] dark:text-slate-300">{desc}</p>
                    {blockedHint ? (
                      <p className="mt-1.5 text-xs font-medium text-amber-800/90 dark:text-amber-400">{blockedHint}</p>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
          {filtered.length === 0 && (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200/90 bg-white shadow-inner dark:border-slate-800 dark:bg-slate-900">
                <Wrench className="h-6 w-6 text-slate-400 dark:text-slate-500" aria-hidden />
              </div>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{t("workflows.noToolsMatch", "No tools match your search")}</p>
              <p className="max-w-sm text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                {t("workflows.noToolsMatchHint", "Try another keyword or switch category. All tools are shown when search is empty.")}
              </p>
            </div>
          )}
      </AppModalBody>
    </AppModal>
  );
}
