"use client";

import { startTransition, useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { storage } from "@/lib/utils/store";
import {
  formatWorkflowDraftForApi,
  mergeSavedWorkflowIntoDraft,
  validateWorkflowDraftForRemotePersist,
  WORKFLOW_DRAFT_STORAGE_KEY,
  type WorkflowDraft,
} from "./workflowsUtils";
import {
  createWorkflow,
  updateWorkflow,
  type WorkflowRecord,
} from "./workflowsApi";
import { formatShortTime } from "./workflowsStudio.utils";
import type { SaveState } from "./WorkflowsStudioHeader";

export function useWorkflowsStudioPersistence(draft: WorkflowDraft, setDraft: React.Dispatch<React.SetStateAction<WorkflowDraft>>, hydrated: boolean) {
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [saveMessage, setSaveMessage] = useState("");
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  const lastRemotePayloadRef = useRef("");
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentWorkflowIdRef = useRef<string | undefined>(undefined);
  const persistDraftPromiseRef = useRef<Promise<WorkflowRecord | null> | null>(null);

  const persistValidation = useMemo(() => validateWorkflowDraftForRemotePersist(draft), [draft]);

  const saveStatusLabel = useMemo(() => {
    if (saveState === "saving") return "Saving…";
    if (saveState === "error") return saveMessage || "Could not save — try again";
    if (saveState === "saved") {
      return lastSavedAt ? `Saved ${formatShortTime(lastSavedAt)}` : saveMessage || "Saved";
    }
    if (saveMessage) return saveMessage;
    if (!draft.workflowId) return "Save keeps a copy on your account";
    return "Autosaves when you edit";
  }, [saveState, saveMessage, lastSavedAt, draft.workflowId]);

  useEffect(() => {
    if (!hydrated) return;
    storage(WORKFLOW_DRAFT_STORAGE_KEY).setObject(draft);
  }, [draft, hydrated]);

  const persistDraft = useCallback(
    async (mode: "auto" | "manual") => {
      const nextValidation = validateWorkflowDraftForRemotePersist(draft);
      if (!nextValidation.isValid) {
        if (mode === "manual") {
          toast.error(nextValidation.issues[0] ?? "Complete required fields first.");
        }
        return null;
      }
      const payload = formatWorkflowDraftForApi(draft);
      const serializedPayload = JSON.stringify(payload);
      if (mode === "auto" && serializedPayload === lastRemotePayloadRef.current) {
        return null;
      }
      if (persistDraftPromiseRef.current) {
        return persistDraftPromiseRef.current;
      }

      const persistPromise = (async () => {
        try {
          setSaveState("saving");
          setSaveMessage("Saving…");
          const saved = draft.workflowId
            ? await updateWorkflow(draft.workflowId, payload)
            : await createWorkflow(payload);
          currentWorkflowIdRef.current = saved.id;
          lastRemotePayloadRef.current = serializedPayload;
          setSaveState("saved");
          setSaveMessage("Saved");
          setLastSavedAt(new Date());
          startTransition(() => {
            setDraft((current) => mergeSavedWorkflowIntoDraft(current, saved));
          });
          return saved;
        } catch (error) {
          setSaveState("error");
          setSaveMessage("Save paused");
          if (mode === "manual") {
            toast.error(error instanceof Error ? error.message : "Could not save.");
          }
          return null;
        } finally {
          persistDraftPromiseRef.current = null;
        }
      })();

      persistDraftPromiseRef.current = persistPromise;
      return persistPromise;
    },
    [draft, setDraft],
  );

  useEffect(() => {
    if (!hydrated) return;
    if (!persistValidation.isValid) return;
    const payload = JSON.stringify(formatWorkflowDraftForApi(draft));
    if (payload === lastRemotePayloadRef.current) return;
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => {
      void persistDraft("auto");
    }, 2500);
    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [draft, hydrated, persistValidation.isValid, persistDraft]);

  const resetPersistenceForWorkflow = useCallback((workflowId: string | undefined, serializedPayload: string) => {
    currentWorkflowIdRef.current = workflowId;
    lastRemotePayloadRef.current = serializedPayload;
  }, []);

  return {
    saveState,
    saveMessage,
    lastSavedAt,
    saveStatusLabel,
    persistValidation,
    persistDraft,
    currentWorkflowIdRef,
    lastRemotePayloadRef,
    resetPersistenceForWorkflow,
    setSaveState,
    setSaveMessage,
    setLastSavedAt,
  };
}
