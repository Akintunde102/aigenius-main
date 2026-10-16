"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { FiCopy, FiCheck, FiExternalLink, FiGlobe, FiLock, FiUpload, FiFileText } from "react-icons/fi";
import toast from "react-hot-toast";
import {
  AppModal,
  AppModalHeader,
  AppModalBody,
  AppModalFooter,
} from "@/app/components/modals/AppModal";
import {
  publishHostedFile,
  type HostedFilePublic,
  type HostedFileVisibility,
} from "@/lib/calls/hosted-file";
import type { CodeProject } from "@/lib/calls/code-projects";
import { copyPublishedConversationUrl } from "@/app/components/model-interface/features/modals/utils/publishedConversationLink.utils";

export function AuthPromptModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const nextParam = encodeURIComponent("/h");
  const loginHref = `/login?next=${nextParam}`;
  const registerHref = `/signup?next=${nextParam}`;

  return (
    <AppModal
      open={isOpen}
      onClose={onClose}
      size="sm"
      ariaLabelledBy="auth-prompt-modal-title"
      className="z-[110]"
    >
      <AppModalHeader
        titleId="auth-prompt-modal-title"
        title="Publish your Markdown"
        subtitle="Sign in or register to publish"
        onClose={onClose}
      />
      <AppModalBody className="space-y-4 !py-4">
        <div
          className="flex items-start gap-3 rounded-xl border p-3.5 text-xs"
          style={{
            borderColor: "var(--modal-border)",
            background: "var(--modal-bg-muted)",
          }}
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--chat-accent,#2563eb)]/10 text-[var(--chat-accent,#2563eb)]">
            <FiFileText size={18} aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-medium text-lp-fg">
              Publish and share your Markdown documents
            </p>
            <p className="mt-1 leading-relaxed text-lp-muted">
              Anyone can read public pages without signing in. To publish and host your own Markdown notes, guides, or docs, please sign in or create an account.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2 pt-2 sm:flex-row">
          <Link
            href={loginHref}
            onClick={onClose}
            className="app-modal-btn-primary flex-1 justify-center py-2.5 text-center text-xs"
          >
            Log in
          </Link>
          <Link
            href={registerHref}
            onClick={onClose}
            className="app-modal-btn-secondary flex-1 justify-center py-2.5 text-center text-xs"
          >
            Register
          </Link>
        </div>
      </AppModalBody>
    </AppModal>
  );
}

export function PublishMarkdownModal({
  isOpen,
  onClose,
  onSuccess,
  projects = [],
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (publishedFile: HostedFilePublic) => void;
  projects?: CodeProject[];
}) {
  const [title, setTitle] = useState("");
  const [markdown, setMarkdown] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<HostedFileVisibility>("public");
  const [allowedEmails, setAllowedEmails] = useState("");
  const [codeProjectId, setCodeProjectId] = useState("");
  const [saveAsDraft, setSaveAsDraft] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishedUrl, setPublishedUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    setPublishedUrl("");
    setCopied(false);
    setTitle("");
    setMarkdown("");
    setDescription("");
    setVisibility("public");
    setAllowedEmails("");
    setCodeProjectId("");
    setSaveAsDraft(false);
  }, [isOpen]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!title) {
      const cleanName = file.name.replace(/\.(md|markdown|txt)$/i, "");
      setTitle(cleanName);
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result;
      if (typeof content === "string") {
        setMarkdown(content);
        toast.success(`Loaded ${file.name}`);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handlePublish = async (event: React.FormEvent) => {
    event.preventDefault();
    const cleanTitle = title.trim();
    const cleanMarkdown = markdown.trim();

    if (!cleanTitle) {
      toast.error("Please enter a title");
      return;
    }
    if (!cleanMarkdown) {
      toast.error("Please enter or upload Markdown content");
      return;
    }

    setPublishing(true);
    try {
      const hosted = await publishHostedFile({
        title: cleanTitle,
        markdown: cleanMarkdown,
        description: description.trim() || undefined,
        visibility,
        allowedEmails:
          visibility === "restricted"
            ? allowedEmails.split(/[\s,;]+/).filter(Boolean)
            : [],
        codeProjectId: codeProjectId || null,
        publish: !saveAsDraft,
      });

      const url = `${window.location.origin}/h/${hosted.slug}`;
      setPublishedUrl(url);
      onSuccess(hosted);
      toast.success(
        saveAsDraft
          ? "Draft saved"
          : visibility === "restricted"
          ? "Private page published"
          : "Page published successfully"
      );
    } catch (error) {
      console.error(error);
      toast.error("Could not publish this Markdown document");
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
    : "Publish notes, documentation, or articles as a public web page";

  return (
    <AppModal
      open={isOpen}
      onClose={onClose}
      size="md"
      ariaLabelledBy="publish-md-modal-title"
      className="z-[110]"
    >
      <AppModalHeader
        titleId="publish-md-modal-title"
        title={modalTitle}
        subtitle={modalSubtitle}
        onClose={onClose}
      />

      {publishedUrl ? (
        <AppModalBody className="space-y-3 !py-3">
          <p className="text-xs" style={{ color: "var(--modal-muted-fg)" }}>
            {saveAsDraft
              ? "Only you can open this draft. Publish it whenever you are ready."
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
            <button
              type="button"
              className="app-modal-btn-primary !text-xs !py-1.5"
              onClick={() => void copyUrl()}
            >
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
            <button
              type="button"
              onClick={onClose}
              className="app-modal-btn-secondary !text-xs !py-1.5 ml-auto"
            >
              Done
            </button>
          </div>
        </AppModalBody>
      ) : (
        <form onSubmit={handlePublish} className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <AppModalBody className="space-y-3 overflow-y-auto !py-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="publish-md-title" className="app-modal-field-label !mb-0">
                  Title *
                </label>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1 text-xs text-[var(--chat-accent,#2563eb)] hover:underline"
                >
                  <FiUpload size={12} />
                  <span>Upload .md file</span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".md,.markdown,text/markdown,text/plain"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>
              <input
                id="publish-md-title"
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="app-modal-input"
                placeholder="e.g. Getting Started Guide"
              />
            </div>

            <div>
              <label htmlFor="publish-md-content" className="app-modal-field-label">
                Markdown Content *
              </label>
              <textarea
                id="publish-md-content"
                required
                rows={7}
                value={markdown}
                onChange={(e) => setMarkdown(e.target.value)}
                className="app-modal-input font-mono text-xs leading-relaxed"
                placeholder="# Header&#10;&#10;Write or paste your Markdown here, or upload a .md file above..."
              />
            </div>

            <div>
              <label htmlFor="publish-md-desc" className="app-modal-field-label">
                Description (optional)
              </label>
              <textarea
                id="publish-md-desc"
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="app-modal-input resize-none"
                placeholder="A short summary for previews and search"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label htmlFor="publish-md-visibility" className="app-modal-field-label">
                  Visibility
                </label>
                <select
                  id="publish-md-visibility"
                  value={visibility}
                  onChange={(e) => setVisibility(e.target.value as HostedFileVisibility)}
                  className="app-modal-input"
                >
                  <option value="public">Public</option>
                  <option value="restricted">Restricted (invite-only)</option>
                </select>
              </div>

              <div>
                <label htmlFor="publish-md-project" className="app-modal-field-label">
                  Project (optional)
                </label>
                <select
                  id="publish-md-project"
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
                <label htmlFor="publish-md-emails" className="app-modal-field-label">
                  Allowed emails
                </label>
                <input
                  id="publish-md-emails"
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
              disabled={publishing || !title.trim() || !markdown.trim()}
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
