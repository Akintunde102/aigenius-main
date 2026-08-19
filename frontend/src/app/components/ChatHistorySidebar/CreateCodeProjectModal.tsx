"use client";

import React, { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { FiFolderPlus, FiX } from "react-icons/fi";
import { Shuffle } from "lucide-react";
import { isAigeniusDesktopRuntime } from "@/lib/utils/desktop-runtime";
import { generateRandomProjectName } from "@/lib/code-projects/random-project-name";

type CreateCodeProjectModalProps = {
  open: boolean;
  onClose: () => void;
  onCreate: (input: { name: string; rootPath: string; rules?: string }) => Promise<void>;
};

function FieldDescription({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-2 text-xs leading-relaxed" style={{ color: "var(--modal-muted-fg)" }}>
      {children}
    </p>
  );
}

export function CreateCodeProjectModal({
  open,
  onClose,
  onCreate,
}: CreateCodeProjectModalProps) {
  const [name, setName] = useState("");
  const [rootPath, setRootPath] = useState("");
  const [rules, setRules] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || saving) return;
      e.preventDefault();
      e.stopPropagation();
      onClose();
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [open, onClose, saving]);

  const handlePickFolder = useCallback(async () => {
    const bridge = window.aigeniusDesktop;
    if (bridge && typeof bridge.pickProjectDirectory === "function") {
      try {
        const picked = await bridge.pickProjectDirectory();
        if (picked?.path) setRootPath(picked.path);
      } catch {
        setError("Could not open folder picker");
      }
      return;
    }
    setError("Folder picker is available in the desktop app only");
  }, []);

  const handleRandomName = useCallback(() => {
    setName(generateRandomProjectName());
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim() || !rootPath.trim()) {
      setError("Name and folder path are required");
      return;
    }
    setSaving(true);
    try {
      await onCreate({
        name: name.trim(),
        rootPath: rootPath.trim(),
        rules: rules.trim() || undefined,
      });
      setName("");
      setRootPath("");
      setRules("");
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create project");
    } finally {
      setSaving(false);
    }
  }, [name, rootPath, rules, onCreate, onClose]);

  if (!open || !mounted || typeof document === "undefined") {
    return null;
  }

  const desktop = isAigeniusDesktopRuntime();

  const overlay = (
    <div
      role="presentation"
      className="app-modal-overlay backdrop-blur-[2px]"
      onClick={saving ? undefined : onClose}
    >
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-code-project-title"
        className="app-modal-panel max-w-md shadow-xl"
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="app-modal-panel-header flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="mb-1 flex items-center gap-2">
              <div
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                style={{
                  background: "color-mix(in srgb, var(--chat-accent) 12%, transparent)",
                  color: "var(--chat-accent)",
                }}
                aria-hidden
              >
                <FiFolderPlus className="h-4 w-4" />
              </div>
              <h2 id="create-code-project-title" className="text-base font-semibold">
                New project
              </h2>
            </div>
            <p className="text-xs" style={{ color: "var(--modal-muted-fg)" }}>
              Scope chats to a folder with optional rules for the model.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="shrink-0 rounded-lg p-2 transition-colors hover:bg-red-500/10 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-sky-500/40 disabled:opacity-50"
            style={{ color: "var(--modal-muted-fg)" }}
            aria-label="Close"
          >
            <FiX className="h-4 w-4" />
          </button>
        </div>

        <div className="app-modal-panel-body space-y-4">
          <div>
            <label htmlFor="code-project-name" className="app-modal-field-label">
              Name
            </label>
            <FieldDescription>
              A short label shown in the sidebar. You can change it later.
            </FieldDescription>
            <div className="flex gap-2">
              <input
                id="code-project-name"
                className="app-modal-input min-w-0 flex-1"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. my-app"
                autoFocus
              />
              <button
                type="button"
                onClick={handleRandomName}
                className="flex shrink-0 items-center gap-1.5 rounded-lg border px-3 text-sm font-medium transition-colors hover:bg-[color-mix(in_srgb,var(--surface-muted)_80%,transparent)]"
                style={{
                  borderColor: "var(--modal-border)",
                  color: "var(--modal-fg)",
                  background: "var(--surface-muted)",
                }}
                aria-label="Generate random name"
              >
                <Shuffle className="h-3.5 w-3.5" aria-hidden />
                Random
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="code-project-path" className="app-modal-field-label">
              Folder
            </label>
            <FieldDescription>
              Root directory for search indexing and desktop file access.
            </FieldDescription>
            <div className="flex gap-2">
              <input
                id="code-project-path"
                className="app-modal-input min-w-0 flex-1"
                value={rootPath}
                onChange={(e) => setRootPath(e.target.value)}
                placeholder={desktop ? "Pick or paste path" : "Absolute path to project root"}
              />
              {desktop ? (
                <button
                  type="button"
                  onClick={() => void handlePickFolder()}
                  className="shrink-0 rounded-lg border px-3 text-sm font-medium transition-colors hover:bg-[color-mix(in_srgb,var(--surface-muted)_80%,transparent)]"
                  style={{
                    borderColor: "var(--modal-border)",
                    color: "var(--modal-fg)",
                    background: "var(--surface-muted)",
                  }}
                >
                  Browse
                </button>
              ) : null}
            </div>
          </div>

          <div>
            <label htmlFor="code-project-rules" className="app-modal-field-label">
              Rules <span className="normal-case font-normal tracking-normal opacity-70">(optional)</span>
            </label>
            <FieldDescription>
              Stack, conventions, or architecture notes injected into every chat in this project.
            </FieldDescription>
            <textarea
              id="code-project-rules"
              className="app-modal-input resize-y"
              rows={3}
              value={rules}
              onChange={(e) => setRules(e.target.value)}
              placeholder="e.g. NestJS API, Next.js frontend, Tilt dev…"
            />
          </div>

          {error ? (
            <p className="text-sm text-red-500" role="alert">
              {error}
            </p>
          ) : null}
        </div>

        <div
          className="flex shrink-0 items-center justify-end gap-2 border-t px-5 py-3"
          style={{ borderColor: "var(--modal-border)" }}
        >
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3 py-1.5 text-sm font-medium transition-opacity hover:opacity-80 disabled:opacity-50"
            style={{ color: "var(--modal-muted-fg)" }}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="app-modal-btn-primary px-4 py-1.5 text-sm"
            disabled={saving}
          >
            {saving ? "Creating…" : "Create"}
          </button>
        </div>
      </form>
    </div>
  );

  const portalTarget = document.getElementById("modal-root") ?? document.body;
  return createPortal(overlay, portalTarget);
}
