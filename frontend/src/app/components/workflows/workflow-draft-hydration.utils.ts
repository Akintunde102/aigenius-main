import type { ResultLinkDraft, WorkflowDraft, WorkflowScheduleRecord } from './workflow-types';
import { cloneValue } from './workflow-clone.utils';
import { friendlyToolName } from './workflow-string.utils';
import { buildStepLocalId, ensureStepCanvasPositions } from './workflow-draft.utils';
import { hydrateScheduleDraftFromRecord } from './workflow-schedule.utils';
import { detectTokenStepId } from './workflow-token.utils';

export function rankWorkflowProgress(draft: WorkflowDraft): number {
  let score = 0;
  if (draft.name.trim()) score += 25;
  if (draft.steps.length > 0) score += 25;
  if (draft.steps.some((step) => step.resultLink?.sourceStepId)) score += 20;
  if (draft.steps.every((step) => step.toolName && step.label.trim())) score += 20;
  if (draft.schedules.some((schedule) => schedule.enabled)) score += 10;
  return Math.min(score, 100);
}

export function hydrateDraftFromWorkflow(workflow: {
  id: string;
  name: string;
  description?: string | null;
  isPublic?: boolean;
  schedules?: WorkflowScheduleRecord[];
  steps: Array<{
    stepId: string;
    toolName: string;
    label?: string;
    args?: Record<string, unknown>;
    canvasX?: number;
    canvasY?: number;
  }>;
}): WorkflowDraft {
  const steps = ensureStepCanvasPositions(
    workflow.steps.map((step) => ({
      localId: buildStepLocalId(),
      label: step.label?.trim() || friendlyToolName(step.toolName),
      stepId: step.stepId,
      toolName: step.toolName,
      args: cloneValue(step.args ?? {}),
      resultLink: inferResultLink(step.args ?? {}),
      canvasX: step.canvasX,
      canvasY: step.canvasY,
    })),
  );
  return {
    workflowId: workflow.id,
    name: workflow.name,
    description: workflow.description ?? "",
    isPublic: Boolean(workflow.isPublic),
    steps,
    schedules: (workflow.schedules ?? []).map((schedule) => hydrateScheduleDraftFromRecord(schedule)),
  };
}

export function mergeSavedWorkflowIntoDraft(
  current: WorkflowDraft,
  saved: {
    id: string;
    name: string;
    description?: string | null;
    isPublic?: boolean;
    schedules?: WorkflowScheduleRecord[];
    steps: Array<{
      stepId: string;
      toolName: string;
      label?: string;
      args?: Record<string, unknown>;
      canvasX?: number;
      canvasY?: number;
    }>;
  },
): WorkflowDraft {
  const savedScheduleById = new Map((saved.schedules ?? []).map((schedule) => [schedule.id, schedule]));
  let schedulesChanged = false;
  const nextSchedules = current.schedules.map((schedule) => {
    const savedSchedule = savedScheduleById.get(schedule.id);
    if (!savedSchedule) {
      return schedule;
    }

    const nextCreatedAt = savedSchedule.createdAt ?? schedule.createdAt;
    const nextUpdatedAt = savedSchedule.updatedAt ?? schedule.updatedAt;
    if (nextCreatedAt === schedule.createdAt && nextUpdatedAt === schedule.updatedAt) {
      return schedule;
    }

    schedulesChanged = true;
    return {
      ...schedule,
      createdAt: nextCreatedAt,
      updatedAt: nextUpdatedAt,
    };
  });

  if (!schedulesChanged && current.workflowId === saved.id) {
    return current;
  }

  return {
    ...current,
    workflowId: saved.id,
    name: current.name,
    description: current.description,
    isPublic: current.isPublic,
    steps: current.steps,
    schedules: schedulesChanged ? nextSchedules : current.schedules,
  };
}

function inferResultLink(args: Record<string, unknown>): ResultLinkDraft | null {
  const entries = collectTokenPaths(args);
  return entries[0] ?? null;
}

function collectTokenPaths(value: unknown, prefix = ""): ResultLinkDraft[] {
  if (typeof value === "string") {
    const stepId = detectTokenStepId(value);
    return stepId && prefix ? [{ sourceStepId: stepId, targetPath: prefix }] : [];
  }

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return [];
  }

  return Object.entries(value).flatMap(([key, child]) =>
    collectTokenPaths(child, prefix ? `${prefix}.${key}` : key),
  );
}
