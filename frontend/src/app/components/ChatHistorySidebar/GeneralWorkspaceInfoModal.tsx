"use client";

import React, { useEffect, useMemo, useState } from "react";
import { FiCheck, FiLoader } from "react-icons/fi";
import { MessageSquare, Star } from "lucide-react";
import { AppModal, AppModalBody, AppModalHeader } from "@/app/components/modals/AppModal";
import type { ChatSession } from "@/app/components/model-interface/shared/types";
import { updateUserChatPreferences } from "@/lib/calls/model-chat-conversation";
import toast from "react-hot-toast";

type GeneralWorkspaceInfoModalProps = {
  chatHistory: ChatSession[];
  initialRules?: string | null;
  onClose: () => void;
  onRulesUpdated?: (rules: string | null) => void;
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

export function GeneralWorkspaceInfoModal({
  chatHistory,
  initialRules,
  onClose,
  onRulesUpdated,
}: GeneralWorkspaceInfoModalProps) {
  const [rulesDraft, setRulesDraft] = useState(initialRules ?? "");
  const [savingRules, setSavingRules] = useState(false);

  useEffect(() => {
    setRulesDraft(initialRules ?? "");
  }, [initialRules]);

  const stats = useMemo(() => {
    const generalSessions = chatHistory.filter((s) => !s.codeProjectId);
    return {
      conversations: generalSessions.length,
      starred: generalSessions.filter((s) => s.starred).length,
    };
  }, [chatHistory]);

  const handleSaveRules = async () => {
    setSavingRules(true);
    try {
      const normalized = rulesDraft.trim() || null;
      await updateUserChatPreferences({ generalRules: normalized });
      onRulesUpdated?.(normalized);
      toast.success("General workspace rules saved");
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save rules");
    } finally {
      setSavingRules(false);
    }
  };

  return (
    <AppModal
      open
      onClose={onClose}
      size="md"
      ariaLabelledBy="general-info-title"
      closeOnOverlayClick={!savingRules}
      closeOnEscape={!savingRules}
    >
      <AppModalHeader
        titleId="general-info-title"
        title="General Workspace"
        subtitle="Default workspace for unassigned conversations"
        onClose={onClose}
      />
      <AppModalBody className="space-y-4 text-xs">
          {/* Stats Bar */}
          <div
            className="flex items-center gap-6 rounded-lg border px-4 py-2.5"
            style={{
              borderColor: "var(--modal-border)",
              backgroundColor: "color-mix(in srgb, var(--modal-muted-fg) 5%, transparent)",
            }}
          >
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 opacity-60" />
              <span>
                <strong className="font-semibold">{stats.conversations}</strong>{" "}
                <span style={{ color: "var(--modal-muted-fg)" }}>conversations</span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 opacity-60 text-amber-500" />
              <span>
                <strong className="font-semibold">{stats.starred}</strong>{" "}
                <span style={{ color: "var(--modal-muted-fg)" }}>starred</span>
              </span>
            </div>
          </div>

          {/* Rules / System Instructions */}
          <div>
            <FieldLabel>General rules & instructions</FieldLabel>
            <p
              className="mb-2 text-[11px] leading-relaxed"
              style={{ color: "var(--modal-muted-fg)" }}
            >
              System prompt rules automatically injected into AI models for conversations in the General workspace. Parallels project-specific rules.
            </p>
            <textarea
              value={rulesDraft}
              onChange={(e) => setRulesDraft(e.target.value)}
              placeholder="e.g. Always respond in TypeScript. Prefer concise explanations. Do not generate unnecessary commentary."
              rows={6}
              disabled={savingRules}
              className="w-full resize-y rounded-lg border p-3 font-mono text-xs leading-relaxed transition focus:outline-none focus:ring-1 focus:ring-sky-500/40"
              style={{
                backgroundColor: "color-mix(in srgb, var(--modal-muted-fg) 6%, transparent)",
                borderColor: "var(--modal-border)",
                color: "var(--modal-fg)",
              }}
            />
          </div>
      </AppModalBody>

      <div
        className="flex items-center justify-end gap-2 border-t px-5 py-3"
        style={{ borderColor: "var(--modal-border)" }}
      >
          <button
            type="button"
            onClick={onClose}
            disabled={savingRules}
            className="rounded-lg border px-3 py-1.5 text-xs font-medium transition hover:opacity-80"
            style={{
              borderColor: "var(--modal-border)",
              color: "var(--modal-muted-fg)",
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSaveRules}
            disabled={savingRules}
            className="flex items-center gap-1.5 rounded-lg bg-sky-500 px-3.5 py-1.5 text-xs font-medium text-white transition hover:bg-sky-600 disabled:opacity-50"
          >
            {savingRules ? (
              <FiLoader className="h-3 w-3 animate-spin" />
            ) : (
              <FiCheck className="h-3 w-3" />
            )}
            Save Rules
          </button>
      </div>
    </AppModal>
  );
}
