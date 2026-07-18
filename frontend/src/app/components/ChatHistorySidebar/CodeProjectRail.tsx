"use client";

import React from "react";
import { FolderKanban } from "lucide-react";
import type { CodeProject } from "@/lib/calls/code-projects";
import type { ActiveCodeProjectSnapshot } from "@/lib/code-projects/active-code-project";

type CodeProjectRailProps = {
  projects: CodeProject[];
  activeProject: ActiveCodeProjectSnapshot | null;
  onSelect: (project: CodeProject | null) => void;
  onCreateClick: () => void;
};

export function CodeProjectRail({
  projects,
  activeProject,
  onSelect,
  onCreateClick,
}: CodeProjectRailProps) {
  if (!projects.length && !activeProject) {
    return (
      <div className="border-b px-2 py-2" style={{ borderColor: "var(--sidebar-border)" }}>
        <button
          type="button"
          onClick={onCreateClick}
          className="flex w-full items-center gap-2 rounded-md border px-2 py-1.5 text-left text-xs transition hover:opacity-90"
          style={{
            borderColor: "var(--sidebar-icon-btn-border)",
            backgroundColor: "var(--sidebar-icon-btn-bg)",
            color: "var(--sidebar-fg)",
          }}
        >
          <FolderKanban className="h-3.5 w-3.5 shrink-0" aria-hidden />
          <span>Create your first project</span>
        </button>
      </div>
    );
  }

  return (
    <div
      className="flex shrink-0 items-center gap-1 border-b px-2 py-1.5"
      style={{ borderColor: "var(--sidebar-border)" }}
    >
      <button
        type="button"
        title="General chats (no project)"
        onClick={() => onSelect(null)}
        className="shrink-0 rounded-md px-2 py-1 text-[11px] font-medium transition"
        style={{
          backgroundColor: !activeProject ? "var(--sidebar-icon-btn-hover-bg)" : "transparent",
          color: "var(--sidebar-muted-fg)",
        }}
      >
        General
      </button>
      <div className="flex min-w-0 flex-1 gap-1 overflow-x-auto">
        {projects.map((p) => {
          const active = activeProject?.id === p.id;
          return (
            <button
              key={p.id}
              type="button"
              title={p.rootPath}
              onClick={() => onSelect(p)}
              className="max-w-[9rem] shrink-0 truncate rounded-md px-2 py-1 text-[11px] font-medium transition"
              style={{
                backgroundColor: active ? "var(--sidebar-icon-btn-hover-bg)" : "var(--sidebar-icon-btn-bg)",
                border: active ? "1px solid var(--sidebar-icon-btn-border)" : "1px solid transparent",
                color: "var(--sidebar-fg)",
              }}
            >
              {p.name}
            </button>
          );
        })}
      </div>
      <button
        type="button"
        aria-label="New project"
        title="New project"
        onClick={onCreateClick}
        className="shrink-0 rounded-md px-2 py-1 text-xs font-semibold text-sky-400 hover:text-sky-300"
      >
        +
      </button>
    </div>
  );
}
