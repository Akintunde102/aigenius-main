"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FiX } from "react-icons/fi";
import { FolderKanban, FolderOpen, MessageSquare, Pencil, Star } from "lucide-react";
import type { CodeProject } from "@/lib/calls/code-projects";
import type { ChatSession } from "@/app/components/model-interface/shared/types";
import { isAigeniusDesktopRuntime } from "@/lib/utils/desktop-runtime";

type CodeProjectUpdateInput = {
  name?: string;
  description?: string | null;
  rules?: string | null;
};

type CodeProjectInfoModalProps = {
  project: CodeProject;
  chatHistory: ChatSession[];
  isActive: boolean;
  onClose: () => void;
  onDelete?: (id: string) => Promise<void>;
  onUpdate?: (id: string, input: CodeProjectUpdateInput) => Promise<unknown>;
};

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="mb-1 text-[10px] font-semibold uppercase tracking-wide"
      style={{ color: "var(--modal-muted-fg)" }}
    >
      {children}
    </div>
  );
}

export function CodeProjectInfoModal({
  project,
  chatHistory,
  isActive,
  onClose,
  onDelete,
  onUpdate,
}: CodeProjectInfoModalProps) {
  const [mounted, setMounted] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(project.name);
  const [descriptionDraft, setDescriptionDraft] = useState(project.description ?? "");
  const [rulesDraft, setRulesDraft] = useState(project.rules ?? "");
  const [savingName, setSavingName] = useState(false);
  const [savingDescription, setSavingDescription] = useState(false);
  const [savingRules, setSavingRules] = useState(false);
  const [openingFolder, setOpeningFolder] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const isDesktop = isAigeniusDesktopRuntime();

  const handleConfirmDelete = async () => {
    if (!onDelete) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await onDelete(project.id);
      onClose();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Failed to delete project");
      setDeleting(false);
    }
  };

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
    if (!editingName) setNameDraft(project.name);
  }, [project.name, editingName]);

  useEffect(() => {
    setDescriptionDraft(project.description ?? "");
  }, [project.description]);

  useEffect(() => {
    setRulesDraft(project.rules ?? "");
  }, [project.rules]);

  useEffect(() => {
    if (editingName) nameInputRef.current?.focus();
  }, [editingName]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      e.stopPropagation();
      if (editingName) {
        setNameDraft(project.name);
        setEditingName(false);
        return;
      }
      onClose();
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [onClose, editingName, project.name]);

  const handleOpenFolder = useCallback(async () => {
    const openFile = window.aigeniusDesktop?.openFile;
    if (!openFile) return;
    setOpeningFolder(true);
    try {
      const result = await openFile(project.rootPath);
      if (!result.ok && result.error) {
        console.error("[CodeProjectInfoModal] open folder:", result.error);
      }
    } finally {
      setOpeningFolder(false);
    }
  }, [project.rootPath]);

  const commitName = async () => {
    const trimmed = nameDraft.trim();
    if (!trimmed || trimmed === project.name) {
      setNameDraft(project.name);
      setEditingName(false);
      return;
    }
    if (!onUpdate) {
      setEditingName(false);
      return;
    }
    setSavingName(true);
    try {
      await onUpdate(project.id, { name: trimmed });
      setEditingName(false);
    } catch {
      setNameDraft(project.name);
      setEditingName(false);
    } finally {
      setSavingName(false);
    }
  };

  const commitDescription = async () => {
    const trimmed = descriptionDraft.trim();
    const current = (project.description ?? "").trim();
    if (trimmed === current) return;
    if (!onUpdate) return;
    setSavingDescription(true);
    try {
      await onUpdate(project.id, { description: trimmed || null });
    } catch {
      setDescriptionDraft(project.description ?? "");
    } finally {
      setSavingDescription(false);
    }
  };

  const commitRules = async () => {
    const trimmed = rulesDraft.trim();
    const current = (project.rules ?? "").trim();
    if (trimmed === current) return;
    if (!onUpdate) return;
    setSavingRules(true);
    try {
      await onUpdate(project.id, { rules: trimmed || null });
    } catch {
      setRulesDraft(project.rules ?? "");
    } finally {
      setSavingRules(false);
    }
  };

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
        className="flex max-h-[min(90vh,34rem)] w-full max-w-md flex-col overflow-hidden rounded-xl border shadow-xl"
        style={{
          background: "var(--modal-bg)",
          borderColor: "var(--modal-border)",
          color: "var(--modal-fg)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between gap-2 px-4 pt-2 pb-1.5">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <div
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md"
              style={{
                background: "color-mix(in srgb, var(--chat-accent) 12%, transparent)",
                color: "var(--chat-accent)",
              }}
              aria-hidden
            >
              <FolderKanban className="h-3 w-3" />
            </div>

            <div className="relative min-h-[1.375rem] min-w-0 flex-1">
              <div
                className={`flex min-w-0 items-center gap-1 ${editingName ? "invisible" : ""}`}
                aria-hidden={editingName}
              >
                <h2
                  id="code-project-info-title"
                  className="truncate text-sm font-semibold leading-snug"
                >
                  {project.name}
                </h2>
                {onUpdate ? (
                  <button
                    type="button"
                    onClick={() => setEditingName(true)}
                    className="shrink-0 rounded p-0.5 transition-colors hover:bg-[color-mix(in_srgb,var(--surface-muted)_80%,transparent)]"
                    style={{ color: "var(--modal-muted-fg)" }}
                    aria-label="Edit project name"
                  >
                    <Pencil className="h-2.5 w-2.5" />
                  </button>
                ) : null}
                {isActive ? (
                  <span
                    className="shrink-0 rounded-full px-1.5 py-px text-[8px] font-semibold uppercase tracking-wide"
                    style={{
                      background: "color-mix(in srgb, var(--chat-accent) 14%, transparent)",
                      color: "var(--chat-accent)",
                    }}
                  >
                    Active
                  </span>
                ) : null}
              </div>

              {editingName ? (
                <input
                  ref={nameInputRef}
                  value={nameDraft}
                  onChange={(e) => setNameDraft(e.target.value)}
                  onBlur={() => void commitName()}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void commitName();
                    }
                  }}
                  disabled={savingName}
                  className="app-modal-input absolute inset-0 h-full min-w-0 px-1.5 py-0 text-sm font-semibold leading-snug"
                  aria-label="Project name"
                />
              ) : null}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-md p-1 transition-colors hover:bg-red-500/10 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-sky-500/40"
            style={{ color: "var(--modal-muted-fg)" }}
            aria-label="Close"
          >
            <FiX className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto px-4 pb-2">
          <div
            className="flex items-center gap-2 rounded-lg px-2.5 py-1.5"
            style={{ background: "var(--modal-bg-muted)" }}
          >
            <FolderOpen
              className="h-3 w-3 shrink-0"
              style={{ color: "var(--modal-muted-fg)" }}
              aria-hidden
            />
            <p
              className="min-w-0 flex-1 truncate font-mono text-[10px] leading-snug"
              style={{ color: "var(--modal-fg)" }}
              title={project.rootPath}
            >
              {project.rootPath}
            </p>
            {isDesktop ? (
              <button
                type="button"
                onClick={() => void handleOpenFolder()}
                disabled={openingFolder}
                className="shrink-0 rounded border px-2 py-0.5 text-[10px] font-medium transition-colors hover:bg-[color-mix(in_srgb,var(--surface-muted)_60%,transparent)] disabled:opacity-50"
                style={{
                  borderColor: "var(--modal-border)",
                  color: "var(--modal-fg)",
                }}
                title="Open in File Explorer"
              >
                {openingFolder ? "Opening…" : "Open"}
              </button>
            ) : null}
          </div>

          <div>
            <FieldLabel>Description</FieldLabel>
            <textarea
              value={descriptionDraft}
              onChange={(e) => setDescriptionDraft(e.target.value)}
              onBlur={() => void commitDescription()}
              disabled={!onUpdate || savingDescription}
              rows={2}
              placeholder="What is this project about?"
              className="app-modal-input resize-y text-xs leading-relaxed disabled:opacity-70"
              aria-label="Project description"
            />
          </div>

          <div>
            <FieldLabel>Rules</FieldLabel>
            <textarea
              value={rulesDraft}
              onChange={(e) => setRulesDraft(e.target.value)}
              onBlur={() => void commitRules()}
              disabled={!onUpdate || savingRules}
              rows={3}
              placeholder="Stack, conventions, or architecture notes for the model…"
              className="app-modal-input resize-y text-xs leading-relaxed disabled:opacity-70"
              aria-label="Project rules"
            />
          </div>
        </div>

        {showConfirmDelete ? (
          <div
            className="flex shrink-0 flex-col gap-2 border-t bg-red-500/5 px-4 py-2.5"
            style={{ borderColor: "var(--modal-border)" }}
          >
            <p className="text-sm font-medium text-red-500">
              Delete this project and all its chats?
            </p>
            {deleteError ? (
              <p className="text-xs font-medium text-red-500">{deleteError}</p>
            ) : null}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowConfirmDelete(false)}
                disabled={deleting}
                className="rounded-lg px-3 py-1.5 text-sm font-medium transition-opacity hover:opacity-80"
                style={{ color: "var(--modal-muted-fg)" }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        ) : (
          <>
            <div
              className="flex shrink-0 items-center justify-between border-t px-4 py-1"
              style={{ borderColor: "var(--modal-border)" }}
            >
              <span
                className="flex items-center gap-1 text-[9px] tabular-nums"
                style={{ color: "var(--modal-muted-fg)" }}
              >
                <MessageSquare className="h-2 w-2" aria-hidden />
                {stats.conversations} chat{stats.conversations !== 1 ? "s" : ""}
              </span>
              <span
                className="flex items-center gap-1 text-[9px] tabular-nums"
                style={{ color: "var(--modal-muted-fg)" }}
              >
                <Star className="h-2 w-2" aria-hidden />
                {stats.starred} starred
              </span>
            </div>

            <div
              className="flex shrink-0 items-center justify-between px-4 py-2"
              style={{ borderColor: "var(--modal-border)" }}
            >
              {onDelete ? (
                <button
                  type="button"
                  onClick={() => setShowConfirmDelete(true)}
                  className="text-xs font-medium text-red-500 transition-opacity hover:opacity-80 focus-visible:outline-none"
                >
                  Delete project
                </button>
              ) : (
                <div />
              )}
              <button
                type="button"
                onClick={onClose}
                className="app-modal-btn-primary px-4 py-1.5 text-sm"
              >
                Done
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );

  const portalTarget = document.getElementById("modal-root") ?? document.body;
  return createPortal(overlay, portalTarget);
}
