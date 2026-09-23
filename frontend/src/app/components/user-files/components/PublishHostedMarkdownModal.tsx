"use client";

import { useEffect, useState } from "react";
import { FiX, FiCopy, FiCheck, FiExternalLink, FiGlobe, FiLock } from "react-icons/fi";
import toast from "react-hot-toast";
import { LightweightModal } from "@/app/components/LightweightModal";
import type { CloudFile } from "@/app/components/file/file.interface";
import { publishHostedFile, type HostedFileVisibility } from "@/lib/calls/hosted-file";
import { listCodeProjects, type CodeProject } from "@/lib/calls/code-projects";
import { buildCloudFileDisplayName } from "../user-files.utils";
import { copyPublishedConversationUrl } from "@/app/components/model-interface/features/modals/utils/publishedConversationLink.utils";

function slugPreview(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function PublishHostedMarkdownModal({
  file,
  isOpen,
  onClose,
}: {
  file: CloudFile | null;
  isOpen: boolean;
  onClose: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<HostedFileVisibility>("public");
  const [allowedEmails, setAllowedEmails] = useState("");
  const [codeProjectId, setCodeProjectId] = useState("");
  const [projects, setProjects] = useState<CodeProject[]>([]);
  const [saveAsDraft, setSaveAsDraft] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishedUrl, setPublishedUrl] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen || !file) return;
    setPublishedUrl("");
    setCopied(false);
    setVisibility("public");
    setAllowedEmails("");
    setCodeProjectId("");
    setSaveAsDraft(false);
    const display = buildCloudFileDisplayName(file).replace(/\.(md|markdown)$/i, "");
    setTitle(display);
    setDescription(file.description || "");
  }, [isOpen, file]);

  useEffect(() => {
    if (!isOpen) return;
    void listCodeProjects()
      .then((rows) => setProjects(Array.isArray(rows) ? rows : []))
      .catch(() => setProjects([]));
  }, [isOpen]);

  if (!file) return null;

  const handlePublish = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!title.trim()) return;
    setPublishing(true);
    try {
      const hosted = await publishHostedFile({
        uploadId: file.id,
        title: title.trim(),
        description: description.trim() || undefined,
        visibility,
        allowedEmails: visibility === "restricted" ? allowedEmails.split(/[\s,;]+/).filter(Boolean) : [],
        codeProjectId: codeProjectId || null,
        publish: !saveAsDraft,
      });
      const url = `${window.location.origin}/h/${hosted.slug}`;
      setPublishedUrl(url);
      toast.success(saveAsDraft ? "Draft saved" : visibility === "restricted" ? "Private page published" : "Page published");
    } catch (error) {
      console.error(error);
      toast.error("Could not publish this Markdown file");
    } finally {
      setPublishing(false);
    }
  };

  const copyUrl = async () => {
    const ok = await copyPublishedConversationUrl(publishedUrl);
    if (ok) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    }
  };

  return (
    <LightweightModal
      isOpen={isOpen}
      onClose={onClose}
      aria-labelledby="publish-hosted-md-title"
    >
      <div className="app-modal-panel w-[min(28rem,calc(100vw-2rem))] p-5">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="app-modal-field-label mb-1">Hosted page</p>
            <h2 id="publish-hosted-md-title" className="text-lg font-semibold text-[var(--modal-fg)]">
              {publishedUrl ? (saveAsDraft ? "Draft saved" : "Your page is live") : "Publish Markdown"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[var(--modal-muted-fg)] hover:bg-[var(--surface-muted)]"
            aria-label="Close"
          >
            <FiX size={16} aria-hidden />
          </button>
        </div>

        {publishedUrl ? (
          <div className="space-y-4">
            <p className="text-sm text-[var(--modal-muted-fg)]">
              {saveAsDraft
                ? "Only you can open this draft. Publish it later from your pages or with the host Markdown tool."
                : visibility === "restricted"
                ? "Only you and the people you invited can open this link."
                : "Anyone with the link can read this page. Sign-in is not required."}
            </p>
            <div className="flex items-center gap-2 rounded-xl border border-[var(--modal-border)] bg-[var(--modal-bg-muted)] px-3 py-2">
              {visibility === "restricted" ? (
                <FiLock className="shrink-0 text-[var(--chat-accent)]" size={16} aria-hidden />
              ) : (
                <FiGlobe className="shrink-0 text-[var(--chat-accent)]" size={16} aria-hidden />
              )}
              <code className="min-w-0 flex-1 truncate text-xs text-[var(--modal-fg)]">{publishedUrl}</code>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" className="app-modal-btn-primary" onClick={() => void copyUrl()}>
                {copied ? <FiCheck size={14} aria-hidden /> : <FiCopy size={14} aria-hidden />}
                {copied ? "Copied" : "Copy link"}
              </button>
              <a
                href={publishedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-10 items-center gap-2 rounded-lg border border-[var(--modal-border)] px-4 text-sm text-[var(--modal-fg)] hover:bg-[var(--surface-muted)]"
              >
                <FiExternalLink size={14} aria-hidden />
                Open page
              </a>
            </div>
          </div>
        ) : (
          <form onSubmit={handlePublish} className="space-y-4">
            <p className="text-sm text-[var(--modal-muted-fg)]">
              Host <span className="font-medium text-[var(--modal-fg)]">{buildCloudFileDisplayName(file)}</span> as a
              Markdown page.
            </p>
            <label className="block">
              <span className="app-modal-field-label">Title</span>
              <input
                className="app-modal-input mt-1 w-full"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                required
                maxLength={180}
              />
            </label>
            <label className="block">
              <span className="app-modal-field-label">Description (optional)</span>
              <textarea
                className="app-modal-input mt-1 w-full resize-none"
                rows={3}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                maxLength={320}
              />
            </label>
            <fieldset>
              <legend className="app-modal-field-label">Who can view</legend>
              <div className="mt-2 grid gap-2">
                <label className="flex cursor-pointer items-start gap-2 rounded-xl border border-[var(--modal-border)] px-3 py-2 text-sm">
                  <input
                    type="radio"
                    name="hosted-visibility"
                    checked={visibility === "public"}
                    onChange={() => setVisibility("public")}
                    className="mt-0.5"
                  />
                  <span>
                    <span className="font-medium text-[var(--modal-fg)]">Public</span>
                    <span className="mt-0.5 block text-xs text-[var(--modal-muted-fg)]">
                      Listed in the library. Anyone with the link can read it.
                    </span>
                  </span>
                </label>
                <label className="flex cursor-pointer items-start gap-2 rounded-xl border border-[var(--modal-border)] px-3 py-2 text-sm">
                  <input
                    type="radio"
                    name="hosted-visibility"
                    checked={visibility === "restricted"}
                    onChange={() => setVisibility("restricted")}
                    className="mt-0.5"
                  />
                  <span>
                    <span className="font-medium text-[var(--modal-fg)]">Restricted</span>
                    <span className="mt-0.5 block text-xs text-[var(--modal-muted-fg)]">
                      Only you and invited emails. Not listed or indexed.
                    </span>
                  </span>
                </label>
              </div>
            </fieldset>
            {visibility === "restricted" ? (
              <label className="block">
                <span className="app-modal-field-label">Invite emails</span>
                <textarea
                  className="app-modal-input mt-1 w-full resize-none"
                  rows={3}
                  value={allowedEmails}
                  onChange={(event) => setAllowedEmails(event.target.value)}
                  placeholder="ada@example.com, bob@example.com"
                />
                <span className="mt-1 block text-xs text-[var(--modal-muted-fg)]">
                  Leave empty to keep the page private to you.
                </span>
              </label>
            ) : null}
            {projects.length > 0 ? (
              <label className="block">
                <span className="app-modal-field-label">Code project (optional)</span>
                <select
                  className="app-modal-input mt-1 w-full"
                  value={codeProjectId}
                  onChange={(event) => setCodeProjectId(event.target.value)}
                >
                  <option value="">No project</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            <label className="flex cursor-pointer items-start gap-2 text-sm">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={saveAsDraft}
                onChange={(event) => setSaveAsDraft(event.target.checked)}
              />
              <span>
                <span className="font-medium text-[var(--modal-fg)]">Save as draft</span>
                <span className="mt-0.5 block text-xs text-[var(--modal-muted-fg)]">
                  Stay unpublished. Only you can open it until you publish.
                </span>
              </span>
            </label>
            {title.trim() ? (
              <p className="text-xs text-[var(--modal-muted-fg)]">
                URL preview: <span className="font-mono">/h/{slugPreview(title) || "page"}</span>
              </p>
            ) : null}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-[var(--modal-muted-fg)]">
                Cancel
              </button>
              <button type="submit" className="app-modal-btn-primary" disabled={publishing || !title.trim()}>
                {publishing ? (saveAsDraft ? "Saving…" : "Publishing…") : saveAsDraft ? "Save draft" : "Publish"}
              </button>
            </div>
          </form>
        )}
      </div>
    </LightweightModal>
  );
}
