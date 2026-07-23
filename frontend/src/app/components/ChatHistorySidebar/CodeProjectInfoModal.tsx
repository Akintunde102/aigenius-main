"use client";

import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { FiX } from "react-icons/fi";
import { FolderKanban, MessageSquare, Star } from "lucide-react";
import type { CodeProject } from "@/lib/calls/code-projects";
import type { ChatSession } from "@/app/components/model-interface/shared/types";

type CodeProjectInfoModalProps = {
  project: CodeProject;
  chatHistory: ChatSession[];
  isActive: boolean;
  onClose: () => void;
};

function formatDate(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <tr className="border-b last:border-b-0" style={{ borderColor: "var(--modal-border)" }}>
      <th
        scope="row"
        className="w-[7.5rem] shrink-0 px-3 py-2.5 text-left align-top text-[11px] font-medium uppercase tracking-wide"
        style={{ color: "var(--modal-muted-fg)" }}
      >
        {label}
      </th>
      <td className="px-3 py-2.5 text-sm leading-relaxed" style={{ color: "var(--modal-fg)" }}>
        {children}
      </td>
    </tr>
  );
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <div
      className="rounded-lg border px-3 py-2.5"
      style={{
        borderColor: "var(--modal-border)",
        backgroundColor: "var(--modal-bg-muted)",
      }}
    >
      <div
        className="mb-1 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide"
        style={{ color: "var(--modal-muted-fg)" }}
      >
        {icon}
        <span>{label}</span>
      </div>
      <p className="text-xl font-semibold tabular-nums" style={{ color: "var(--modal-fg)" }}>
        {value}
      </p>
    </div>
  );
}

export function CodeProjectInfoModal({
  project,
  chatHistory,
  isActive,
  onClose,
}: CodeProjectInfoModalProps) {
  const [mounted, setMounted] = useState(false);

  const stats = useMemo(() => {
    const inProject = chatHistory.filter((s) => s.codeProjectId === project.id);
    return {
      conversations: inProject.length,
      starred: inProject.filter((s) => s.starred).length,
    };
  }, [chatHistory, project.id]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      e.stopPropagation();
      onClose();
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [onClose]);

  if (!mounted || typeof document === "undefined") {
    return null;
  }

  const overlay = (
    <div
      role="presentation"
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 backdrop-blur-[2px]"
      style={{ background: "var(--modal-overlay)" }}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="code-project-info-title"
        className="flex max-h-[min(90vh,40rem)] w-full max-w-lg flex-col overflow-hidden rounded-xl border shadow-xl"
        style={{
          background: "var(--modal-bg)",
          borderColor: "var(--modal-border)",
          color: "var(--modal-fg)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex shrink-0 items-start justify-between gap-3 border-b px-5 py-4"
          style={{
            borderColor: "var(--modal-border)",
            background: "var(--modal-bg-muted)",
          }}
        >
          <div className="min-w-0">
            <div className="mb-1 flex items-center gap-2">
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border"
                style={{
                  borderColor: "var(--modal-border)",
                  background: "var(--modal-bg)",
                  color: "var(--chat-accent)",
                }}
                aria-hidden
              >
                <FolderKanban className="h-4 w-4" />
              </div>
              <h2 id="code-project-info-title" className="truncate text-base font-semibold">
                {project.name}
              </h2>
            </div>
            <p className="text-xs" style={{ color: "var(--modal-muted-fg)" }}>
              {isActive ? "Active project for new chats" : "Project details"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg p-2 transition-colors hover:bg-red-500/10 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-sky-500/40"
            style={{ color: "var(--modal-muted-fg)" }}
            aria-label="Close"
          >
            <FiX className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <div className="mb-4 grid grid-cols-2 gap-2">
            <StatCard
              label="Chats"
              value={stats.conversations}
              icon={<MessageSquare className="h-3 w-3" aria-hidden />}
            />
            <StatCard
              label="Starred"
              value={stats.starred}
              icon={<Star className="h-3 w-3" aria-hidden />}
            />
          </div>

          <div
            className="overflow-hidden rounded-lg border"
            style={{ borderColor: "var(--modal-border)" }}
          >
            <table className="w-full border-collapse text-left">
              <tbody>
                <InfoRow label="Folder">
                  <code className="break-all text-xs">{project.rootPath}</code>
                </InfoRow>
                <InfoRow label="Rules">
                  {project.rules?.trim() ? (
                    <pre className="max-h-40 overflow-y-auto whitespace-pre-wrap font-sans text-xs leading-relaxed opacity-90">
                      {project.rules}
                    </pre>
                  ) : (
                    <span className="text-xs" style={{ color: "var(--modal-muted-fg)" }}>
                      No rules set
                    </span>
                  )}
                </InfoRow>
                <InfoRow label="Created">{formatDate(project.createdAt)}</InfoRow>
                <InfoRow label="Updated">{formatDate(project.updatedAt)}</InfoRow>
                <InfoRow label="Project ID">
                  <code className="break-all text-xs opacity-80">{project.id}</code>
                </InfoRow>
              </tbody>
            </table>
          </div>
        </div>

        <div
          className="flex shrink-0 justify-end border-t px-5 py-4"
          style={{ borderColor: "var(--modal-border)" }}
        >
          <button type="button" onClick={onClose} className="app-modal-btn-primary px-4 py-2">
            Close
          </button>
        </div>
      </div>
    </div>
  );

  const portalTarget = document.getElementById("modal-root") ?? document.body;
  return createPortal(overlay, portalTarget);
}
