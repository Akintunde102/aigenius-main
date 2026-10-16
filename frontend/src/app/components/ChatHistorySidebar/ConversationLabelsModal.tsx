"use client";

import React, { useEffect, useState } from "react";
import {
  FiX,
  FiPlus,
  FiTrash2,
  FiEdit2,
  FiCheck,
  FiLoader,
  FiFolder,
  FiList,
} from "react-icons/fi";
import { AppModal, AppModalBody, AppModalHeader } from "@/app/components/modals/AppModal";
import type {
  ConversationLabel,
  UserChatPreferences,
} from "@/lib/calls/model-chat-conversation";
import {
  createConversationLabel,
  updateConversationLabel,
  deleteConversationLabel,
  updateUserChatPreferences,
} from "@/lib/calls/model-chat-conversation";
import { useQueryClient } from "@tanstack/react-query";
import { chatQueryKeys } from "@/lib/hooks/chat-query-keys";
import toast from "react-hot-toast";

const ACCESSIBLE_PALETTE = [
  "#ef4444", // red
  "#f97316", // orange
  "#f59e0b", // amber
  "#10b981", // emerald
  "#06b6d4", // cyan
  "#3b82f6", // blue
  "#6366f1", // indigo
  "#8b5cf6", // purple
  "#ec4899", // pink
  "#64748b", // slate
];

type ConversationLabelsModalProps = {
  isOpen: boolean;
  preferences?: UserChatPreferences;
  labels: ConversationLabel[];
  onClose: () => void;
};

export function ConversationLabelsModal({
  isOpen,
  preferences,
  labels = [],
  onClose,
}: ConversationLabelsModalProps) {
  const queryClient = useQueryClient();

  const [mode, setMode] = useState<"flat" | "labels">(
    preferences?.sidebarOrganization ?? "flat"
  );
  const [isUpdatingMode, setIsUpdatingMode] = useState(false);

  // New label form
  const [newLabelName, setNewLabelName] = useState("");
  const [newLabelColor, setNewLabelColor] = useState(ACCESSIBLE_PALETTE[5]); // blue default
  const [isCreating, setIsCreating] = useState(false);

  // Edit label state
  const [editingLabelId, setEditingLabelId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("");
  const [isUpdatingLabel, setIsUpdatingLabel] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (preferences?.sidebarOrganization) {
      setMode(preferences.sidebarOrganization);
    }
  }, [preferences?.sidebarOrganization]);

  const canDismiss = !isCreating && !isUpdatingLabel;

  const handleModeChange = async (nextMode: "flat" | "labels") => {
    if (mode === nextMode) return;
    setMode(nextMode);
    setIsUpdatingMode(true);
    try {
      await updateUserChatPreferences({ sidebarOrganization: nextMode });
      await queryClient.invalidateQueries({ queryKey: chatQueryKeys.resources() });
      toast.success(
        nextMode === "labels"
          ? "Sidebar set to colored folders"
          : "Sidebar set to flat list"
      );
    } catch (err) {
      setMode(mode);
      toast.error(err instanceof Error ? err.message : "Failed to update preference");
    } finally {
      setIsUpdatingMode(false);
    }
  };

  const handleCreateLabel = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newLabelName.trim();
    if (!trimmed) return;

    setIsCreating(true);
    try {
      await createConversationLabel({
        name: trimmed,
        color: newLabelColor,
      });
      await queryClient.invalidateQueries({ queryKey: chatQueryKeys.resources() });
      setNewLabelName("");
      toast.success(`Label "${trimmed}" created`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create label");
    } finally {
      setIsCreating(false);
    }
  };

  const startEditing = (label: ConversationLabel) => {
    setEditingLabelId(label.id);
    setEditName(label.name);
    setEditColor(label.color);
  };

  const handleSaveEdit = async (labelId: string) => {
    const trimmed = editName.trim();
    if (!trimmed) return;

    setIsUpdatingLabel(true);
    try {
      await updateConversationLabel(labelId, {
        name: trimmed,
        color: editColor,
      });
      await queryClient.invalidateQueries({ queryKey: chatQueryKeys.resources() });
      setEditingLabelId(null);
      toast.success("Label updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update label");
    } finally {
      setIsUpdatingLabel(false);
    }
  };

  const handleDeleteLabel = async (label: ConversationLabel) => {
    if (!window.confirm(`Delete label "${label.name}"? Conversations will remain safe.`)) {
      return;
    }
    setDeletingId(label.id);
    try {
      await deleteConversationLabel(label.id);
      await queryClient.invalidateQueries({ queryKey: chatQueryKeys.resources() });
      toast.success(`Label "${label.name}" deleted`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete label");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <AppModal
      open={isOpen}
      onClose={onClose}
      size="md"
      ariaLabelledBy="labels-modal-title"
      closeOnOverlayClick={canDismiss}
      closeOnEscape={canDismiss}
      panelClassName="flex max-h-[85vh] flex-col overflow-hidden"
    >
      <AppModalHeader
        titleId="labels-modal-title"
        title="Conversation Labels"
        subtitle="Organize and categorize your chat history"
        onClose={onClose}
      />
      <AppModalBody className="min-h-0 flex-1 space-y-6 overflow-y-auto text-xs">
          {/* Organization Mode Selector */}
          <div>
            <div
              className="mb-1 text-[10px] font-semibold uppercase tracking-wide"
              style={{ color: "var(--modal-muted-fg)" }}
            >
              Sidebar layout mode
            </div>
            <div className="grid grid-cols-2 gap-3 mt-2">
              <button
                type="button"
                disabled={isUpdatingMode}
                onClick={() => handleModeChange("flat")}
                className={`flex flex-col items-start p-3 rounded-lg border transition text-left relative ${
                  mode === "flat"
                    ? "ring-2 ring-sky-500/80 border-sky-500 bg-sky-500/5"
                    : "border-slate-500/20 hover:border-slate-500/40"
                }`}
                style={{
                  backgroundColor:
                    mode === "flat"
                      ? "color-mix(in srgb, var(--chat-accent, #0ea5e9) 8%, transparent)"
                      : "transparent",
                }}
              >
                <div className="flex items-center gap-2 font-medium text-xs mb-1">
                  <FiList className="text-sky-500" size={15} />
                  <span>Flat list</span>
                </div>
                <p className="text-[11px] leading-snug" style={{ color: "var(--modal-muted-fg)" }}>
                  Chats sorted purely by recency with subtle color tags.
                </p>
              </button>

              <button
                type="button"
                disabled={isUpdatingMode}
                onClick={() => handleModeChange("labels")}
                className={`flex flex-col items-start p-3 rounded-lg border transition text-left relative ${
                  mode === "labels"
                    ? "ring-2 ring-sky-500/80 border-sky-500 bg-sky-500/5"
                    : "border-slate-500/20 hover:border-slate-500/40"
                }`}
                style={{
                  backgroundColor:
                    mode === "labels"
                      ? "color-mix(in srgb, var(--chat-accent, #0ea5e9) 8%, transparent)"
                      : "transparent",
                }}
              >
                <div className="flex items-center gap-2 font-medium text-xs mb-1">
                  <FiFolder className="text-sky-500" size={15} />
                  <span>Colored folders</span>
                </div>
                <p className="text-[11px] leading-snug" style={{ color: "var(--modal-muted-fg)" }}>
                  Chats organized into color-coded folders with an Others bucket.
                </p>
              </button>
            </div>
          </div>

          {/* Add New Label */}
          <div
            className="rounded-lg border p-3.5"
            style={{
              borderColor: "var(--modal-border)",
              backgroundColor: "color-mix(in srgb, var(--modal-muted-fg) 4%, transparent)",
            }}
          >
            <div
              className="mb-2 text-[10px] font-semibold uppercase tracking-wide"
              style={{ color: "var(--modal-muted-fg)" }}
            >
              Create new label
            </div>
            <form onSubmit={handleCreateLabel} className="space-y-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Label name (e.g. Bug, Research, Design)"
                  value={newLabelName}
                  onChange={(e) => setNewLabelName(e.target.value)}
                  disabled={isCreating}
                  className="flex-1 rounded-lg border px-3 py-1.5 text-xs transition focus:outline-none focus:ring-1 focus:ring-sky-500/40"
                  style={{
                    backgroundColor: "var(--modal-bg)",
                    borderColor: "var(--modal-border)",
                    color: "var(--modal-fg)",
                  }}
                />
                <button
                  type="submit"
                  disabled={isCreating || !newLabelName.trim()}
                  className="flex items-center gap-1.5 rounded-lg bg-sky-500 px-3.5 py-1.5 text-xs font-medium text-white transition hover:bg-sky-600 disabled:opacity-50 shrink-0"
                >
                  {isCreating ? (
                    <FiLoader size={12} className="animate-spin" />
                  ) : (
                    <FiPlus size={14} />
                  )}
                  Add
                </button>
              </div>

              {/* Color Swatches */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {ACCESSIBLE_PALETTE.map((color) => {
                  const isSelected = newLabelColor.toLowerCase() === color.toLowerCase();
                  return (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setNewLabelColor(color)}
                      className={`h-5 w-5 rounded-full transition flex items-center justify-center shrink-0 ${
                        isSelected ? "ring-2 ring-sky-500 ring-offset-2" : "hover:scale-110"
                      }`}
                      style={{ backgroundColor: color }}
                      aria-label={`Select color ${color}`}
                    >
                      {isSelected && <FiCheck size={11} className="text-white" strokeWidth={3} />}
                    </button>
                  );
                })}
              </div>
            </form>
          </div>

          {/* Existing Labels List */}
          <div>
            <div
              className="mb-2 text-[10px] font-semibold uppercase tracking-wide"
              style={{ color: "var(--modal-muted-fg)" }}
            >
              Your labels ({labels.length})
            </div>

            {labels.length === 0 ? (
              <p
                className="py-4 text-center text-[11px]"
                style={{ color: "var(--modal-muted-fg)" }}
              >
                No labels created yet. Add your first label above!
              </p>
            ) : (
              <div className="space-y-1.5">
                {labels.map((label) => {
                  const isEditing = editingLabelId === label.id;
                  const isDeleting = deletingId === label.id;

                  if (isEditing) {
                    return (
                      <div
                        key={label.id}
                        className="flex flex-col gap-2 rounded-lg border p-2.5"
                        style={{
                          borderColor: "var(--modal-border)",
                          backgroundColor: "color-mix(in srgb, var(--modal-muted-fg) 6%, transparent)",
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            disabled={isUpdatingLabel}
                            className="flex-1 rounded-md border px-2.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-sky-500/40"
                            style={{
                              backgroundColor: "var(--modal-bg)",
                              borderColor: "var(--modal-border)",
                              color: "var(--modal-fg)",
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveEdit(label.id)}
                            disabled={isUpdatingLabel || !editName.trim()}
                            className="p-1.5 rounded-md bg-sky-500 text-white hover:bg-sky-600 transition disabled:opacity-50"
                            title="Save label"
                          >
                            {isUpdatingLabel ? (
                              <FiLoader size={12} className="animate-spin" />
                            ) : (
                              <FiCheck size={12} />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingLabelId(null)}
                            disabled={isUpdatingLabel}
                            className="p-1.5 rounded-md border text-slate-400 hover:text-slate-200 transition"
                            title="Cancel"
                          >
                            <FiX size={12} />
                          </button>
                        </div>
                        <div className="flex items-center gap-1.5 pt-1">
                          {ACCESSIBLE_PALETTE.map((c) => (
                            <button
                              key={c}
                              type="button"
                              onClick={() => setEditColor(c)}
                              className={`h-4 w-4 rounded-full transition flex items-center justify-center shrink-0 ${
                                editColor.toLowerCase() === c.toLowerCase()
                                  ? "ring-2 ring-sky-500 ring-offset-1"
                                  : "hover:scale-110"
                              }`}
                              style={{ backgroundColor: c }}
                            >
                              {editColor.toLowerCase() === c.toLowerCase() && (
                                <FiCheck size={9} className="text-white" strokeWidth={3} />
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={label.id}
                      className="flex items-center justify-between rounded-lg border px-3 py-2 transition"
                      style={{
                        borderColor: "var(--modal-border)",
                        backgroundColor: "var(--modal-bg)",
                      }}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className="h-3 w-3 rounded-full shrink-0 shadow-xs"
                          style={{ backgroundColor: label.color }}
                        />
                        <span className="font-medium truncate" style={{ color: "var(--modal-fg)" }}>
                          {label.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => startEditing(label)}
                          className="p-1 rounded-md transition hover:opacity-100 opacity-60 hover:bg-slate-500/10"
                          style={{ color: "var(--modal-fg)" }}
                          title="Edit label"
                        >
                          <FiEdit2 size={12} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteLabel(label)}
                          disabled={isDeleting}
                          className="p-1 rounded-md text-red-400 hover:text-red-500 transition hover:bg-red-500/10 opacity-70 hover:opacity-100"
                          title="Delete label"
                        >
                          {isDeleting ? (
                            <FiLoader size={12} className="animate-spin" />
                          ) : (
                            <FiTrash2 size={12} />
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
      </AppModalBody>

      <div
        className="flex shrink-0 items-center justify-end border-t px-5 py-3"
        style={{ borderColor: "var(--modal-border)" }}
      >
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border px-3.5 py-1.5 text-xs font-medium transition hover:opacity-80"
          style={{
            borderColor: "var(--modal-border)",
            color: "var(--modal-muted-fg)",
          }}
        >
          Done
        </button>
      </div>
    </AppModal>
  );
}
