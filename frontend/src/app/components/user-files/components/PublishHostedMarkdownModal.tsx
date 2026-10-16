"use client";

import { useEffect, useState } from "react";
import { FiCopy, FiCheck, FiExternalLink, FiGlobe, FiLock } from "react-icons/fi";
import toast from "react-hot-toast";
import {
  AppModal,
  AppModalHeader,
  AppModalBody,
  AppModalFooter,
} from "@/app/components/modals/AppModal";
import type { CloudFile } from "@/app/components/file/file.interface";
import { publishHostedFile, type HostedFileVisibility } from "@/lib/calls/hosted-file";
import { listCodeProjects, type CodeProject } from "@/lib/calls/code-projects";
import { buildCloudFileDisplayName } from "../user-files.utils";
import { copyPublishedConversationUrl } from "@/app/components/model-interface/features/modals/utils/publishedConversationLink.utils";

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

  const modalTitle = publishedUrl
    ? saveAsDraft
      ? "Draft saved"
      : "Your page is live"
    : "Publish Markdown";

  const modalSubtitle = publishedUrl
    ? "Share your hosted Markdown document"
    : `Publish ${buildCloudFileDisplayName(file)} as a web page`;

  return (
    <AppModal
      open={isOpen}
      onClose={onClose}
      size="sm"
      ariaLabelledBy="publish-hosted-md-title"
      className="z-[110]"
    >
      <AppModalHeader
        titleId="publish-hosted-md-title"
        title={modalTitle}
        subtitle={modalSubtitle}
        onClose={onClose}
      />

      {publishedUrl ? (
        <AppModalBody className="space-y-3 !py-3">
          <p className="text-xs" style={{ color: "var(--modal-muted-fg)" }}>
            {saveAsDraft
              ? "Only you can open this draft. Publish it later from your pages or with the host Markdown tool."
              : visibility === "restricted"
              ? "Only you and the people you invited can open this link."
              : "Anyone with the link can read this page. Sign-in is not required."}
          </p>

          <div
            className="flex items-center gap-2 rounded-lg border p-2 text-xs"
            style={{
              borderColor: "var(--modal-border)",
              background: "var(--modal-bg-muted)",
            }}
          >
            {visibility === "restricted" ? (
              <FiLock className="shrink-0 text-[var(--chat-accent)]" size={14} aria-hidden />
            ) : (
              <FiGlobe className="shrink-0 text-[var(--chat-accent)]" size={14} aria-hidden />
            )}
            <code className="min-w-0 flex-1 truncate font-mono text-[11px]" style={{ color: "var(--modal-fg)" }}>
              {publishedUrl}
            </code>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            <button type="button" className="app-modal-btn-primary !text-xs !py-1.5" onClick={() => void copyUrl()}>
              {copied ? <FiCheck size={12} aria-hidden /> : <FiCopy size={12} aria-hidden />}
              {copied ? "Copied" : "Copy link"}
            </button>
            <a
              href={publishedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="app-modal-btn-secondary !text-xs !py-1.5"
            >
              <FiExternalLink size={12} aria-hidden />
              Open page
            </a>
          </div>
        </AppModalBody>
      ) : (
        <form onSubmit={handlePublish} className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <AppModalBody className="space-y-3 overflow-y-auto !py-3">
            <div>
              <label htmlFor="h-title" className="app-modal-field-label">Title *</label>
              <input
                id="h-title"
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="app-modal-input"
                placeholder="Page title"
              />
            </div>

            <div>
              <label htmlFor="h-desc" className="app-modal-field-label">Description (optional)</label>
              <textarea
                id="h-desc"
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="app-modal-input resize-none"
                placeholder="A short summary for previews and search"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label htmlFor="h-visibility" className="app-modal-field-label">Visibility</label>
                <select
                  id="h-visibility"
                  value={visibility}
                  onChange={(e) => setVisibility(e.target.value as HostedFileVisibility)}
                  className="app-modal-input"
                >
                  <option value="public">Public</option>
                  <option value="unlisted">Unlisted</option>
                  <option value="restricted">Restricted (invite-only)</option>
                </select>
              </div>

              <div>
                <label htmlFor="h-project" className="app-modal-field-label">Project (optional)</label>
                <select
                  id="h-project"
                  value={codeProjectId}
                  onChange={(e) => setCodeProjectId(e.target.value)}
                  className="app-modal-input"
                >
                  <option value="">None</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {visibility === "restricted" && (
              <div>
                <label htmlFor="h-emails" className="app-modal-field-label">Allowed emails</label>
                <input
                  id="h-emails"
                  type="text"
                  value={allowedEmails}
                  onChange={(e) => setAllowedEmails(e.target.value)}
                  className="app-modal-input"
                  placeholder="alice@example.com, bob@example.com"
                />
              </div>
            )}

            <label className="flex items-center gap-2 text-xs cursor-pointer select-none" style={{ color: "var(--modal-fg)" }}>
              <input
                type="checkbox"
                checked={saveAsDraft}
                onChange={(e) => setSaveAsDraft(e.target.checked)}
                className="rounded text-[var(--chat-accent)] focus:ring-[var(--chat-accent)]"
              />
              Save as draft (do not publish immediately)
            </label>
          </AppModalBody>

          <AppModalFooter>
            <button type="button" onClick={onClose} className="app-modal-btn-secondary text-xs">
              Cancel
            </button>
            <button
              type="submit"
              disabled={publishing || !title.trim()}
              className="app-modal-btn-primary text-xs"
            >
              {publishing ? "Publishing…" : saveAsDraft ? "Save draft" : "Publish page"}
            </button>
          </AppModalFooter>
        </form>
      )}
    </AppModal>
  );
}
