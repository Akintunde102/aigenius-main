"use client";

import React from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import {
  FiZap,
  FiX,
  FiTrash2,
  FiRefreshCw,
  FiPlus,
  FiTerminal,
  FiMessageSquare,
  FiPlay,
  FiEdit2,
  FiCheck,
  FiExternalLink,
  FiLoader,
  FiAlertCircle,
} from "react-icons/fi";
import { RenderErrorBoundary } from "@/app/components/RenderErrorBoundary";
import { AppModal, AppModalBody, AppModalHeader } from "@/app/components/modals/AppModal";
import { useLanguage } from "@/lib/providers/LanguageProvider";
import {
  acceptFastButtonSuggestions,
  deleteFastButton,
  fetchFastButtons,
  generateFastButtonSuggestions,
  upsertFastButton,
  type FastButtonKind,
  type FastButtonRecord,
  type FastButtonSuggestionProposal,
} from "./fastButtonsApi";
import { executeFastButtonRun, toastFastButtonFinished } from "./runFastButton.client";

type FastButtonsModalProps = {
  onClose: () => void;
};

type RunViewState = {
  label: string;
  status: string;
  output: string;
  conversationId?: string | null;
  error?: string;
};

function FastButtonsModalInner({ onClose }: FastButtonsModalProps) {
  const { t } = useLanguage();
  const [buttons, setButtons] = React.useState<FastButtonRecord[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [isSuggesting, setIsSuggesting] = React.useState(false);
  const [suggestions, setSuggestions] = React.useState<FastButtonSuggestionProposal[]>([]);
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [runView, setRunView] = React.useState<RunViewState | null>(null);
  const [runningId, setRunningId] = React.useState<string | null>(null);

  // Form state for Create / Edit
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [editingButton, setEditingButton] = React.useState<FastButtonRecord | null>(null);
  const [formLabel, setFormLabel] = React.useState("");
  const [formKind, setFormKind] = React.useState<FastButtonKind>("agent_instruction");
  const [formCommand, setFormCommand] = React.useState("");
  const [formInstruction, setFormInstruction] = React.useState("");
  const [formCwd, setFormCwd] = React.useState("");
  const [formModelId, setFormModelId] = React.useState("");
  const [isSaving, setIsSaving] = React.useState(false);

  // Delete confirmation
  const [confirmDeleteId, setConfirmDeleteId] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const list = await fetchFastButtons();
      setButtons(list);
    } catch {
      toast.error(t("fastButtons.loadError", "Could not load fast buttons"), {
        id: "fast-buttons-load-error",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const handleModalClose = React.useCallback(() => {
    if (isFormOpen) {
      setIsFormOpen(false);
      setEditingButton(null);
      return;
    }
    onClose();
  }, [isFormOpen, onClose]);

  const openCreateForm = () => {
    setEditingButton(null);
    setFormLabel("");
    setFormKind("agent_instruction");
    setFormCommand("");
    setFormInstruction("");
    setFormCwd("");
    setFormModelId("");
    setIsFormOpen(true);
  };

  const openEditForm = (b: FastButtonRecord) => {
    setEditingButton(b);
    setFormLabel(b.label);
    setFormKind(b.kind);
    setFormCommand(b.config.command ?? "");
    setFormInstruction(b.config.instruction ?? "");
    setFormCwd(b.config.cwd ?? "");
    setFormModelId(b.config.modelId ?? "");
    setIsFormOpen(true);
  };

  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    const label = formLabel.trim();
    if (!label) {
      toast.error(t("fastButtons.labelRequired", "Button label is required"));
      return;
    }

    if (formKind === "shell_command" && !formCommand.trim()) {
      toast.error(t("fastButtons.commandRequired", "Command is required for terminal shortcut"));
      return;
    }

    if (formKind !== "shell_command" && !formInstruction.trim()) {
      toast.error(t("fastButtons.instructionRequired", "Instruction is required"));
      return;
    }

    setIsSaving(true);
    try {
      await upsertFastButton({
        id: editingButton?.id,
        label,
        kind: formKind,
        config: {
          command: formKind === "shell_command" ? formCommand.trim() : undefined,
          cwd: formKind === "shell_command" && formCwd.trim() ? formCwd.trim() : undefined,
          instruction: formKind !== "shell_command" ? formInstruction.trim() : undefined,
          modelId: formModelId.trim() || undefined,
        },
      });
      toast.success(
        editingButton
          ? t("fastButtons.updated", "Fast button updated")
          : t("fastButtons.created", "Fast button created"),
      );
      setIsFormOpen(false);
      setEditingButton(null);
      await load();
    } catch {
      toast.error(t("fastButtons.saveError", "Could not save fast button"));
    } finally {
      setIsSaving(false);
    }
  };

  const handleRun = async (button: FastButtonRecord) => {
    setRunningId(button.id);
    setRunView({
      label: button.label,
      status: "starting",
      output: "",
      conversationId: null,
    });
    try {
      const run = await executeFastButtonRun(button.id, {
        onStdout: (chunk) => {
          setRunView((prev) =>
            prev ? { ...prev, output: prev.output + chunk } : prev,
          );
        },
        onStatus: (status) => {
          setRunView((prev) => (prev ? { ...prev, status } : prev));
        },
      });
      setRunView((prev) =>
        prev
          ? {
              ...prev,
              status: "succeeded",
              conversationId: run.conversationId,
            }
          : prev,
      );
      toastFastButtonFinished(button.label, run.conversationId);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Run failed";
      setRunView((prev) =>
        prev ? { ...prev, status: "failed", error: msg } : prev,
      );
      toast.error(msg);
    } finally {
      setRunningId(null);
    }
  };

  const handleSuggest = async () => {
    setIsSuggesting(true);
    try {
      const proposals = await generateFastButtonSuggestions();
      setSuggestions(proposals);
      setSelected(new Set(proposals.map((p) => p.proposalId)));
      if (!proposals.length) {
        toast(t("fastButtons.noSuggestions", "No suggestions from recent chats yet."));
      }
    } catch {
      toast.error(t("fastButtons.suggestError", "Could not generate suggestions"));
    } finally {
      setIsSuggesting(false);
    }
  };

  const handleToggleSelectAll = () => {
    if (selected.size === suggestions.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(suggestions.map((p) => p.proposalId)));
    }
  };

  const handleAcceptSuggestions = async () => {
    const picked = suggestions.filter((p) => selected.has(p.proposalId));
    if (!picked.length) return;
    try {
      await acceptFastButtonSuggestions(picked);
      toast.success(t("fastButtons.accepted", "Added fast buttons"));
      setSuggestions([]);
      setSelected(new Set());
      await load();
    } catch {
      toast.error(t("fastButtons.acceptError", "Could not save suggestions"));
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteFastButton(id);
      setButtons((prev) => prev.filter((b) => b.id !== id));
      setConfirmDeleteId(null);
      toast.success(t("fastButtons.deleted", "Button deleted"));
    } catch {
      toast.error(t("fastButtons.deleteError", "Could not delete"));
    }
  };

  const renderKindBadge = (kind: FastButtonKind) => {
    switch (kind) {
      case "shell_command":
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
            <FiTerminal size={12} />
            {t("fastButtons.kindShell", "Terminal")}
          </span>
        );
      case "chat_instruction":
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-600 dark:text-amber-400">
            <FiMessageSquare size={12} />
            {t("fastButtons.kindChat", "Chat Prompt")}
          </span>
        );
      case "agent_instruction":
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-sky-500/10 px-2 py-0.5 text-[11px] font-medium text-sky-600 dark:text-sky-400">
            <FiZap size={12} />
            {t("fastButtons.kindAgent", "Agent Task")}
          </span>
        );
    }
  };

  return (
    <AppModal
      open
      onClose={handleModalClose}
      size="xl"
      className="z-[10002]"
      ariaLabelledBy="fast-buttons-title"
      panelClassName="flex max-h-[90vh] flex-col overflow-hidden"
    >
      <AppModalHeader
        titleId="fast-buttons-title"
        title={t("fastButtons.title", "Fast buttons")}
        subtitle={t(
          "fastButtons.subtitle",
          "Global one-tap shortcuts for terminal commands, common prompts, and agent workflows across your account.",
        )}
        onClose={handleModalClose}
      />
      <AppModalBody className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto">
          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="app-modal-btn-primary inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium"
                onClick={openCreateForm}
              >
                <FiPlus size={14} />
                {t("fastButtons.newButton", "New button")}
              </button>
              <button
                type="button"
                disabled={isSuggesting}
                className="inline-flex items-center gap-2 rounded-lg border border-[var(--modal-border)] bg-[var(--modal-bg-muted)] px-3 py-2 text-xs font-medium text-[var(--modal-fg)] transition-colors hover:bg-[var(--modal-border)] disabled:opacity-50"
                onClick={() => void handleSuggest()}
              >
                <FiRefreshCw size={13} className={isSuggesting ? "animate-spin" : ""} />
                {isSuggesting
                  ? t("fastButtons.suggesting", "Analyzing chats...")
                  : t("fastButtons.suggest", "Suggest from recent chats")}
              </button>
            </div>
            <div className="text-xs text-[var(--modal-muted-fg)]">
              {buttons.length} {buttons.length === 1 ? t("fastButtons.singleCount", "shortcut") : t("fastButtons.multipleCount", "shortcuts")}
            </div>
          </div>

          {/* Create / Edit Form Drawer */}
          {isFormOpen && (
            <form
              onSubmit={(e) => void handleSaveForm(e)}
              className="rounded-xl border border-sky-500/30 bg-sky-500/5 p-4 transition-all dark:bg-sky-500/10"
            >
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-[var(--modal-fg)]">
                  {editingButton
                    ? t("fastButtons.editTitle", "Edit Fast Button")
                    : t("fastButtons.createTitle", "Create Fast Button")}
                </h3>
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="rounded p-1 text-[var(--modal-muted-fg)] hover:text-[var(--modal-fg)]"
                >
                  <FiX size={15} />
                </button>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-[var(--modal-muted-fg)]">
                    {t("fastButtons.label", "Button Label")} *
                  </label>
                  <input
                    type="text"
                    required
                    value={formLabel}
                    onChange={(e) => setFormLabel(e.target.value)}
                    placeholder="e.g. List git branches"
                    className="mt-1 w-full rounded-lg border border-[var(--modal-border)] bg-[var(--modal-bg)] px-3 py-1.5 text-xs text-[var(--modal-fg)] outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[var(--modal-muted-fg)]">
                    {t("fastButtons.kind", "Action Kind")}
                  </label>
                  <select
                    value={formKind}
                    onChange={(e) => setFormKind(e.target.value as FastButtonKind)}
                    className="mt-1 w-full rounded-lg border border-[var(--modal-border)] bg-[var(--modal-bg)] px-3 py-1.5 text-xs text-[var(--modal-fg)] outline-none focus:border-sky-500"
                  >
                    <option value="agent_instruction">{t("fastButtons.kindAgent", "Agent Task (New Conversation)")}</option>
                    <option value="shell_command">{t("fastButtons.kindShell", "Terminal Command (Desktop Shell)")}</option>
                    <option value="chat_instruction">{t("fastButtons.kindChat", "Chat Prompt (Insert into Composer)")}</option>
                  </select>
                </div>

                {formKind === "shell_command" ? (
                  <>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-medium text-[var(--modal-muted-fg)]">
                        {t("fastButtons.shellCommand", "Shell Command")} *
                      </label>
                      <input
                        type="text"
                        required
                        value={formCommand}
                        onChange={(e) => setFormCommand(e.target.value)}
                        placeholder="e.g. git status && git log -n 3"
                        className="mt-1 w-full rounded-lg border border-[var(--modal-border)] bg-[var(--modal-bg)] px-3 py-1.5 font-mono text-xs text-[var(--modal-fg)] outline-none focus:border-sky-500"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-medium text-[var(--modal-muted-fg)]">
                        {t("fastButtons.cwd", "Working Directory (optional)")}
                      </label>
                      <input
                        type="text"
                        value={formCwd}
                        onChange={(e) => setFormCwd(e.target.value)}
                        placeholder="e.g. /path/to/project"
                        className="mt-1 w-full rounded-lg border border-[var(--modal-border)] bg-[var(--modal-bg)] px-3 py-1.5 font-mono text-xs text-[var(--modal-fg)] outline-none focus:border-sky-500"
                      />
                    </div>
                  </>
                ) : (
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-[var(--modal-muted-fg)]">
                      {t("fastButtons.instruction", "Instruction / Prompt Content")} *
                    </label>
                    <textarea
                      required
                      rows={3}
                      value={formInstruction}
                      onChange={(e) => setFormInstruction(e.target.value)}
                      placeholder="e.g. Review the last git commit and summarize key risks or regressions."
                      className="mt-1 w-full rounded-lg border border-[var(--modal-border)] bg-[var(--modal-bg)] px-3 py-1.5 text-xs text-[var(--modal-fg)] outline-none focus:border-sky-500"
                    />
                  </div>
                )}
              </div>

              <div className="mt-4 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="rounded-lg px-3 py-1.5 text-xs text-[var(--modal-muted-fg)] hover:bg-[var(--modal-bg-muted)]"
                >
                  {t("common.cancel", "Cancel")}
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="app-modal-btn-primary rounded-lg px-4 py-1.5 text-xs font-medium disabled:opacity-50"
                >
                  {isSaving ? t("common.saving", "Saving...") : t("common.save", "Save button")}
                </button>
              </div>
            </form>
          )}

          {/* Suggestions Drawer */}
          {suggestions.length > 0 && (
            <section className="rounded-xl border border-[var(--modal-border)] bg-[var(--modal-bg-muted)] p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold text-[var(--modal-fg)]">
                    {t("fastButtons.reviewSuggestions", "Review suggestions")}
                  </h3>
                  <p className="text-xs text-[var(--modal-muted-fg)]">
                    {t("fastButtons.reviewSubtitle", "Repeated terminal tasks and prompts detected in your chats.")}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleToggleSelectAll}
                    className="text-xs text-sky-600 hover:underline dark:text-sky-400"
                  >
                    {selected.size === suggestions.length
                      ? t("fastButtons.deselectAll", "Deselect all")
                      : t("fastButtons.selectAll", "Select all")}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {suggestions.map((p) => {
                  const isChecked = selected.has(p.proposalId);
                  return (
                    <div
                      key={p.proposalId}
                      onClick={() => {
                        setSelected((prev) => {
                          const next = new Set(prev);
                          if (next.has(p.proposalId)) next.delete(p.proposalId);
                          else next.add(p.proposalId);
                          return next;
                        });
                      }}
                      className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${
                        isChecked
                          ? "border-sky-500 bg-sky-500/5 dark:bg-sky-500/10"
                          : "border-[var(--modal-border)] bg-[var(--modal-bg)] hover:border-[var(--modal-muted-fg)]"
                      }`}
                    >
                      <div className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border border-[var(--modal-border)] bg-[var(--modal-bg)]">
                        {isChecked && <FiCheck size={12} className="text-sky-500" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate text-xs font-semibold text-[var(--modal-fg)]">
                            {p.label}
                          </span>
                          {renderKindBadge(p.kind)}
                        </div>
                        <p className="mt-1 text-[11px] text-[var(--modal-muted-fg)]">{p.rationale}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-3 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setSuggestions([])}
                  className="text-xs text-[var(--modal-muted-fg)] hover:underline"
                >
                  {t("common.dismiss", "Dismiss")}
                </button>
                <button
                  type="button"
                  aria-label={t("fastButtons.addSelected", "Add selected")}
                  disabled={selected.size === 0}
                  className="app-modal-btn-primary rounded-lg px-3 py-1.5 text-xs font-medium disabled:opacity-50"
                  onClick={() => void handleAcceptSuggestions()}
                >
                  {t("fastButtons.addSelected", "Add selected")} ({selected.size})
                </button>
              </div>
            </section>
          )}

          {/* Active Run Output Panel */}
          {runView && (
            <section className="rounded-xl border border-[var(--modal-border)] bg-[var(--modal-bg-muted)] p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-[var(--modal-fg)]">{runView.label}</h3>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                      runView.status === "succeeded"
                        ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                        : runView.status === "failed"
                        ? "bg-rose-500/15 text-rose-600 dark:text-rose-400"
                        : "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                    }`}
                  >
                    {runView.status === "running" || runView.status === "starting" ? (
                      <FiLoader size={10} className="animate-spin" />
                    ) : null}
                    {runView.status}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setRunView(null)}
                  className="rounded p-1 text-[var(--modal-muted-fg)] hover:text-[var(--modal-fg)]"
                  aria-label={t("common.close", "Close output")}
                >
                  <FiX size={15} />
                </button>
              </div>

              {runView.error && (
                <div className="mt-2.5 flex items-center gap-2 rounded-lg bg-rose-500/10 p-2.5 text-xs text-rose-600 dark:text-rose-400">
                  <FiAlertCircle size={15} className="shrink-0" />
                  <span>{runView.error}</span>
                </div>
              )}

              {runView.output ? (
                <pre className="mt-2.5 max-h-48 overflow-y-auto whitespace-pre-wrap rounded-lg bg-[var(--modal-bg)] p-3 font-mono text-xs text-[var(--modal-fg)] shadow-inner">
                  {runView.output}
                </pre>
              ) : null}

              {runView.conversationId && (
                <div className="mt-3">
                  <Link
                    href={`/chat/${runView.conversationId}`}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-sky-500"
                    onClick={onClose}
                  >
                    <FiExternalLink size={13} />
                    {t("fastButtons.openConversation", "Open conversation")}
                  </Link>
                </div>
              )}
            </section>
          )}

          {/* Buttons List */}
          {loading ? (
            <div className="flex h-40 items-center justify-center text-xs text-[var(--modal-muted-fg)]">
              <FiLoader size={18} className="mr-2 animate-spin text-sky-500" />
              {t("common.loading", "Loading fast buttons...")}
            </div>
          ) : buttons.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--modal-border)] py-12 text-center">
              <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/10 text-amber-500">
                <FiZap size={20} />
              </div>
              <h4 className="text-sm font-medium text-[var(--modal-fg)]">
                {t("fastButtons.noButtonsTitle", "No fast buttons yet")}
              </h4>
              <p className="mt-1 max-w-sm text-xs text-[var(--modal-muted-fg)]">
                {t(
                  "fastButtons.empty",
                  "Create one-tap shortcuts for terminal tasks or prompts, or click 'Suggest from project chats'.",
                )}
              </p>
              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={openCreateForm}
                  className="app-modal-btn-primary rounded-lg px-3 py-1.5 text-xs font-medium"
                >
                  <FiPlus size={13} className="mr-1 inline" />
                  {t("fastButtons.newButton", "New button")}
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
              {buttons.map((b) => {
                const isRunningThis = runningId === b.id;
                const isConfirmingDelete = confirmDeleteId === b.id;
                const snippet = b.config.command || b.config.instruction || "";

                return (
                  <div
                    key={b.id}
                    className="group relative flex flex-col justify-between rounded-xl border border-[var(--modal-border)] bg-[var(--modal-bg)] p-3.5 transition-all hover:border-[var(--modal-muted-fg)]/40 hover:shadow-sm"
                  >
                    <div>
                      {/* Top Bar: Badge & Action icons */}
                      <div className="flex items-center justify-between gap-2">
                        {renderKindBadge(b.kind)}

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => openEditForm(b)}
                            className="rounded p-1 text-[var(--modal-muted-fg)] opacity-70 transition-opacity hover:bg-[var(--modal-bg-muted)] hover:opacity-100"
                            title={t("common.edit", "Edit")}
                          >
                            <FiEdit2 size={13} />
                          </button>

                          {isConfirmingDelete ? (
                            <div className="flex items-center gap-1 rounded bg-rose-500/10 px-1 py-0.5">
                              <button
                                type="button"
                                onClick={() => void handleDelete(b.id)}
                                className="text-[10px] font-bold text-rose-600 hover:underline dark:text-rose-400"
                              >
                                {t("common.confirm", "Delete")}
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(null)}
                                className="p-0.5 text-[var(--modal-muted-fg)]"
                              >
                                <FiX size={11} />
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(b.id)}
                              className="rounded p-1 text-[var(--modal-muted-fg)] opacity-70 transition-opacity hover:bg-rose-500/10 hover:text-rose-600 hover:opacity-100"
                              title={t("common.delete", "Delete")}
                            >
                              <FiTrash2 size={13} />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Title */}
                      <button
                        type="button"
                        onClick={() => void handleRun(b)}
                        disabled={isRunningThis}
                        className="mt-2 text-left text-sm font-semibold text-[var(--modal-fg)] transition hover:text-sky-600 disabled:opacity-50 dark:hover:text-sky-400"
                      >
                        {b.label}
                      </button>

                      {/* Snippet Preview */}
                      {snippet ? (
                        <p className="mt-1 line-clamp-2 font-mono text-[11px] text-[var(--modal-muted-fg)]">
                          {snippet}
                        </p>
                      ) : null}
                    </div>

                    {/* Run Action */}
                    <div className="mt-3 flex items-center justify-end border-t border-[var(--modal-border)] pt-2.5">
                      <button
                        type="button"
                        disabled={isRunningThis}
                        onClick={() => void handleRun(b)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--modal-bg-muted)] px-3 py-1.5 text-xs font-semibold text-[var(--modal-fg)] transition hover:bg-sky-600 hover:text-white disabled:opacity-50"
                      >
                        {isRunningThis ? (
                          <>
                            <FiLoader size={12} className="animate-spin" />
                            {t("fastButtons.running", "Running...")}
                          </>
                        ) : (
                          <>
                            <FiPlay size={12} />
                            {t("fastButtons.run", "Run")}
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
      </AppModalBody>
    </AppModal>
  );
}

export function FastButtonsModal(props: FastButtonsModalProps) {
  return (
    <RenderErrorBoundary logLabel="[fast-buttons-modal]">
      <FastButtonsModalInner {...props} />
    </RenderErrorBoundary>
  );
}
