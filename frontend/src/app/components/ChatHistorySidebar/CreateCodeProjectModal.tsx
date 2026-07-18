"use client";

import React, { useCallback, useState } from "react";
import { isAigeniusDesktopRuntime } from "@/lib/utils/desktop-runtime";

type CreateCodeProjectModalProps = {
  open: boolean;
  onClose: () => void;
  onCreate: (input: { name: string; rootPath: string; rules?: string }) => Promise<void>;
};

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

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim() || !rootPath.trim()) {
      setError("Name and project path are required");
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

  if (!open) return null;

  const desktop = isAigeniusDesktopRuntime();

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-code-project-title"
    >
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-lg border p-4 shadow-xl"
        style={{
          backgroundColor: "var(--sidebar-bg, #1e293b)",
          borderColor: "var(--sidebar-border, #334155)",
          color: "var(--sidebar-fg, #f1f5f9)",
        }}
      >
        <h2 id="create-code-project-title" className="mb-3 text-base font-semibold">
          New code project
        </h2>
        <p className="mb-4 text-xs opacity-80">
          Chats under this project get scoped search, rules, and desktop indexing for the folder you choose.
        </p>

        <label className="mb-2 block text-xs font-medium">Name</label>
        <input
          className="mb-3 w-full rounded-md border px-2 py-1.5 text-sm"
          style={{ borderColor: "var(--sidebar-border)", backgroundColor: "var(--sidebar-search-bg)" }}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. aigenius-platform"
          autoFocus
        />

        <label className="mb-2 block text-xs font-medium">Project folder path</label>
        <div className="mb-3 flex gap-2">
          <input
            className="min-w-0 flex-1 rounded-md border px-2 py-1.5 text-sm"
            style={{ borderColor: "var(--sidebar-border)", backgroundColor: "var(--sidebar-search-bg)" }}
            value={rootPath}
            onChange={(e) => setRootPath(e.target.value)}
            placeholder={desktop ? "Pick or paste absolute path" : "Absolute path to project root"}
          />
          {desktop ? (
            <button
              type="button"
              onClick={() => void handlePickFolder()}
              className="shrink-0 rounded-md border px-2 text-xs"
              style={{ borderColor: "var(--sidebar-border)" }}
            >
              Browse
            </button>
          ) : null}
        </div>

        <label className="mb-2 block text-xs font-medium">Rules (optional)</label>
        <textarea
          className="mb-4 w-full rounded-md border px-2 py-1.5 text-sm"
          style={{ borderColor: "var(--sidebar-border)", backgroundColor: "var(--sidebar-search-bg)" }}
          rows={4}
          value={rules}
          onChange={(e) => setRules(e.target.value)}
          placeholder="Stack, conventions, architecture notes for the model…"
        />

        {error ? <p className="mb-3 text-xs text-red-400">{error}</p> : null}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-3 py-1.5 text-sm opacity-80 hover:opacity-100"
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="rounded-md bg-sky-600 px-3 py-1.5 text-sm text-white hover:bg-sky-500 disabled:opacity-50"
            disabled={saving}
          >
            {saving ? "Creating…" : "Create project"}
          </button>
        </div>
      </form>
    </div>
  );
}
