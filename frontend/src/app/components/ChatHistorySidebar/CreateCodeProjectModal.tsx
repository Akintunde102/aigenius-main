"use client";

import React, { useCallback, useEffect, useState } from "react";
import { FolderPlus, Shuffle } from "lucide-react";
import {
  AppModal,
  AppModalHeader,
  AppModalBody,
  AppModalFooter,
} from "@/app/components/modals/AppModal";
import { isAigeniusDesktopRuntime } from "@/lib/utils/desktop-runtime";
import { generateRandomProjectName } from "@/lib/code-projects/random-project-name";
import {
  applyCreateNamedFolderResult,
  deriveProjectNameFromPath,
  resolveNameForNamedFolderCreate,
} from "@/lib/code-projects/named-project-folder.utils";

type CreateCodeProjectModalProps = {
  open: boolean;
  onClose: () => void;
  onCreate: (input: { name: string; rootPath: string; rules?: string }) => Promise<void>;
  existingProjects?: Array<{ name: string; rootPath?: string }>;
};

function FieldDescription({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-1 text-[11px] leading-snug" style={{ color: "var(--modal-muted-fg)" }}>
      {children}
    </p>
  );
}

export function CreateCodeProjectModal({
  open,
  onClose,
  onCreate,
  existingProjects,
}: CreateCodeProjectModalProps) {
  const [name, setName] = useState("");
  const [rootPath, setRootPath] = useState("");
  const [rules, setRules] = useState("");
  const [saving, setSaving] = useState(false);
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [pickerDefaultPath, setPickerDefaultPath] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const applySelectedFolderPath = useCallback(
    (newPath: string) => {
      setRootPath(newPath);
      const derived = deriveProjectNameFromPath(newPath, existingProjects);
      if (derived) {
        setName(derived);
      }
    },
    [existingProjects],
  );

  useEffect(() => {
    if (!open || !isAigeniusDesktopRuntime()) {
      return;
    }
    const bridge = window.aigeniusDesktop;
    if (!bridge || typeof bridge.getProjectFolderPickerDefaults !== "function") {
      return;
    }
    void bridge.getProjectFolderPickerDefaults().then((defaults) => {
      const path = defaults?.defaultBrowsePath?.trim();
      if (path) {
        setPickerDefaultPath(path);
      }
    });
  }, [open]);

  const handlePickFolder = useCallback(async () => {
    const bridge = window.aigeniusDesktop;
    if (bridge && typeof bridge.pickProjectDirectory === "function") {
      try {
        const picked = await bridge.pickProjectDirectory();
        if (picked?.path) {
          applySelectedFolderPath(picked.path);
        }
      } catch {
        setError("Could not open folder picker");
      }
      return;
    }
    setError("Folder picker is available in the desktop app only");
  }, [applySelectedFolderPath]);

  const handleRandomName = useCallback(() => {
    setName(generateRandomProjectName());
  }, []);

  const handleCreateNamedFolder = useCallback(async () => {
    const resolved = resolveNameForNamedFolderCreate(name, generateRandomProjectName);
    if (resolved.generated) {
      setName(resolved.name);
    }

    const bridge = window.aigeniusDesktop;
    if (!bridge || typeof bridge.createNamedProjectDirectory !== "function") {
      setError("Creating folders is available in the desktop app only");
      return;
    }

    setCreatingFolder(true);
    setError(null);
    try {
      const result = await bridge.createNamedProjectDirectory({ folderName: resolved.name });
      const applied = applyCreateNamedFolderResult(result);
      if (applied.status === "filled") {
        applySelectedFolderPath(applied.path);
        return;
      }
      if (applied.status === "error") {
        setError(applied.message);
      }
    } catch {
      setError("Could not create folder");
    } finally {
      setCreatingFolder(false);
    }
  }, [name, applySelectedFolderPath]);

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

  const desktop = isAigeniusDesktopRuntime();

  return (
    <AppModal
      open={open}
      onClose={onClose}
      size="sm"
      ariaLabelledBy="create-code-project-title"
      closeOnEscape={!saving && !creatingFolder}
      closeOnOverlayClick={!saving && !creatingFolder}
      className="z-[110]"
    >
      <AppModalHeader
        titleId="create-code-project-title"
        title="New project"
        subtitle="Scope chats to a folder with optional rules for the model."
        onClose={onClose}
      />

      <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <AppModalBody className="space-y-3 overflow-y-auto !py-3">
          <div>
            <label htmlFor="code-project-path" className="app-modal-field-label">
              Folder
            </label>
            <FieldDescription>
              {desktop
                ? "Use New to create a folder or Browse to pick an existing one. Paths cannot be typed — the system folder picker keeps paths valid."
                : "Root directory for search indexing and desktop file access."}
            </FieldDescription>
            {desktop ? (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => void handleCreateNamedFolder()}
                  disabled={saving || creatingFolder}
                  className="app-modal-btn-secondary flex-1 !text-xs !py-1.5"
                  aria-label="Create a folder named after this project"
                  title="Create a folder named after this project"
                  aria-busy={creatingFolder}
                >
                  <FolderPlus className="h-3.5 w-3.5" aria-hidden />
                  {creatingFolder ? "Creating…" : "New"}
                </button>
                <button
                  type="button"
                  onClick={() => void handlePickFolder()}
                  disabled={saving || creatingFolder}
                  className="app-modal-btn-secondary flex-1 !text-xs !py-1.5"
                >
                  Browse
                </button>
              </div>
            ) : (
              <input
                id="code-project-path"
                className="app-modal-input min-w-0 font-mono text-xs"
                value={rootPath}
                onChange={(e) => applySelectedFolderPath(e.target.value)}
                placeholder="Absolute path to project root"
                autoFocus
              />
            )}
            {desktop && pickerDefaultPath ? (
              <p
                className="mt-1.5 text-[11px] font-mono break-all"
                style={{ color: "var(--modal-muted-fg)" }}
                data-testid="folder-picker-root"
              >
                Folder picker starts in:{" "}
                <span className="font-semibold" style={{ color: "var(--modal-fg)" }}>
                  {pickerDefaultPath}
                </span>
              </p>
            ) : null}
            <div className="mt-1">
              {rootPath ? (
                <p className="text-[11px] font-mono break-all" style={{ color: "var(--modal-muted-fg)" }} data-testid="folder-full-path">
                  Full path: <span className="font-semibold" style={{ color: "var(--modal-fg)" }}>{rootPath}</span>
                </p>
              ) : (
                <p className="text-[11px] font-mono opacity-60" style={{ color: "var(--modal-muted-fg)" }} data-testid="folder-full-path">
                  No folder selected
                </p>
              )}
            </div>
          </div>

          <div>
            <label htmlFor="code-project-name" className="app-modal-field-label">
              Name
            </label>
            <FieldDescription>
              A short label shown in the sidebar. Automatically generated from folder.
            </FieldDescription>
            <div className="flex gap-2">
              <input
                id="code-project-name"
                className="app-modal-input min-w-0 flex-1"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. my-app"
              />
              <button
                type="button"
                onClick={handleRandomName}
                className="app-modal-btn-secondary shrink-0 !text-xs !py-1.5"
                aria-label="Generate random name"
              >
                <Shuffle className="h-3 w-3" aria-hidden />
                Random
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="code-project-rules" className="app-modal-field-label">
              Rules <span className="normal-case font-normal tracking-normal opacity-70">(optional)</span>
            </label>
            <FieldDescription>
              Stack, conventions, or architecture notes injected into every chat.
            </FieldDescription>
            <textarea
              id="code-project-rules"
              className="app-modal-input resize-y"
              rows={2}
              value={rules}
              onChange={(e) => setRules(e.target.value)}
              placeholder="e.g. NestJS API, Next.js frontend, Tilt dev…"
            />
          </div>

          {error ? (
            <p className="text-xs text-red-500 font-medium" role="alert">
              {error}
            </p>
          ) : null}
        </AppModalBody>

        <AppModalFooter>
          <button
            type="button"
            onClick={onClose}
            className="app-modal-btn-secondary text-xs"
            disabled={saving || creatingFolder}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="app-modal-btn-primary text-xs"
            disabled={saving || creatingFolder}
          >
            {saving ? "Creating…" : "Create"}
          </button>
        </AppModalFooter>
      </form>
    </AppModal>
  );
}
