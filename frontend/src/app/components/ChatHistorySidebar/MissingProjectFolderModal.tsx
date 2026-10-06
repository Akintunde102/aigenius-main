"use client";

import React, { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { FiX } from "react-icons/fi";
import { FolderOpen, FolderPlus, Trash2 } from "lucide-react";
import type { CodeProject } from "@/lib/calls/code-projects";
import type { CodeProjectRootHealth } from "@/lib/code-projects/code-project-root-health.types";

type MissingProjectFolderModalProps = {
  project: CodeProject;
  health: CodeProjectRootHealth;
  onClose: () => void;
  onDismiss: () => void;
  onRelink: () => Promise<void>;
  onRecreate: () => Promise<void>;
  onRemoveProject: () => Promise<void>;
};

function statusMessage(health: CodeProjectRootHealth): string {
  switch (health.status) {
    case 'permission_denied':
      return 'The project folder exists but this app cannot access it. Fix permissions or choose a different folder.';
    case 'not_directory':
      return 'The saved path points to a file, not a folder. Relink to the correct project directory.';
    case 'missing':
    default:
      return 'This project folder is missing on your computer. It may have been moved, renamed, or deleted outside AIGenius.';
  }
}

export function MissingProjectFolderModal({
  project,
  health,
  onClose,
  onDismiss,
  onRelink,
  onRecreate,
  onRemoveProject,
}: MissingProjectFolderModalProps) {
  const [mounted, setMounted] = useState(false);
  const [busy, setBusy] = useState<'relink' | 'recreate' | 'remove' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || busy) return;
      e.preventDefault();
      e.stopPropagation();
      if (confirmRemove) {
        setConfirmRemove(false);
        return;
      }
      onDismiss();
      onClose();
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [busy, confirmRemove, onClose, onDismiss]);

  const runAction = useCallback(
    async (kind: 'relink' | 'recreate' | 'remove', fn: () => Promise<void>) => {
      setError(null);
      setBusy(kind);
      try {
        await fn();
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      } finally {
        setBusy(null);
      }
    },
    [onClose],
  );

  if (!mounted) {
    return null;
  }

  return createPortal(
    <div
      className="app-modal-overlay fixed inset-0 z-[12000] flex items-center justify-center p-4"
      style={{ background: "var(--modal-overlay)" }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="missing-folder-title"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !busy) {
          onDismiss();
          onClose();
        }
      }}
    >
      <div
        className="app-modal-panel relative w-full max-w-md rounded-xl border p-5 shadow-xl"
        style={{
          background: "var(--modal-bg)",
          borderColor: "var(--modal-border)",
          color: "var(--modal-fg)",
        }}
      >
        <button
          type="button"
          className="absolute right-3 top-3 rounded p-1 opacity-70 transition hover:opacity-100"
          aria-label="Close"
          disabled={Boolean(busy)}
          onClick={() => {
            onDismiss();
            onClose();
          }}
        >
          <FiX className="h-4 w-4" />
        </button>

        <h2 id="missing-folder-title" className="pr-8 text-base font-semibold">
          Project folder not found
        </h2>
        <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--modal-muted-fg)" }}>
          <span className="font-medium" style={{ color: "var(--modal-fg)" }}>{project.name}</span>
          {" — "}
          {statusMessage(health)}
        </p>
        <p
          className="mt-3 break-all rounded-md px-3 py-2 font-mono text-[11px]"
          style={{ background: "var(--modal-bg-muted)", color: "var(--modal-muted-fg)" }}
        >
          {project.rootPath}
        </p>

        {error ? (
          <p className="mt-3 text-sm text-red-500" role="alert">{error}</p>
        ) : null}

        {confirmRemove ? (
          <div className="mt-4 space-y-3">
            <p className="text-sm" style={{ color: "var(--modal-muted-fg)" }}>
              Remove <strong>{project.name}</strong> from the sidebar? Your conversations stay in history.
              This does not delete files on disk.
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="app-modal-btn-primary rounded-lg px-3 py-2 text-sm font-medium"
                disabled={busy === 'remove'}
                onClick={() => void runAction('remove', onRemoveProject)}
              >
                {busy === 'remove' ? "Removing…" : "Remove project"}
              </button>
              <button
                type="button"
                className="rounded-lg border px-3 py-2 text-sm"
                style={{ borderColor: "var(--modal-border)" }}
                disabled={Boolean(busy)}
                onClick={() => setConfirmRemove(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-5 flex flex-col gap-2">
            <button
              type="button"
              className="app-modal-btn-primary flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium"
              disabled={Boolean(busy)}
              onClick={() => void runAction('relink', onRelink)}
            >
              <FolderOpen className="h-4 w-4" aria-hidden />
              {busy === 'relink' ? "Choosing folder…" : "Relink folder"}
            </button>
            {health.canRecreate ? (
              <button
                type="button"
                className="flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition hover:opacity-90"
                style={{ borderColor: "var(--modal-border)" }}
                disabled={Boolean(busy)}
                onClick={() => void runAction('recreate', onRecreate)}
              >
                <FolderPlus className="h-4 w-4" aria-hidden />
                {busy === 'recreate' ? "Creating…" : "Recreate empty folder"}
              </button>
            ) : null}
            {health.canRecreate ? (
              <p className="text-[11px] leading-snug" style={{ color: "var(--modal-muted-fg)" }}>
                Recreate makes an empty folder at the path above. It does not restore deleted files.
              </p>
            ) : null}
            <button
              type="button"
              className="flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm transition hover:opacity-90"
              style={{ color: "var(--modal-muted-fg)" }}
              disabled={Boolean(busy)}
              onClick={() => setConfirmRemove(true)}
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden />
              Remove project from app
            </button>
            <button
              type="button"
              className="mt-1 text-sm underline-offset-2 hover:underline"
              style={{ color: "var(--modal-muted-fg)" }}
              disabled={Boolean(busy)}
              onClick={() => {
                onDismiss();
                onClose();
              }}
            >
              Not now
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
