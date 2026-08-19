import {
  WORKFLOW_CANVAS_ORIGIN,
  WORKFLOW_CANVAS_STEP_SPACING_X,
  type ToolSchema,
  type WorkflowDraft,
  type WorkflowPayload,
  type WorkflowStepDraft,
  type WorkflowTool,
} from './workflow-types';
import { cloneValue } from './workflow-clone.utils';
import { friendlyToolName } from './workflow-string.utils';
import {
  buildCronExpression,
  detectUserTimezone,
  toIsoStringOrFallback,
} from './workflow-schedule.utils';
import { createResultToken, setValueAtPath } from './workflow-token.utils';

export function buildStepLocalId() {
  return `step-local-${Math.random().toString(36).slice(2, 10)}`;
}

export function slugifyStepId(value: string): string {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "step";
}

export function ensureUniqueStepId(stepId: string, existingStepIds: string[]): string {
  const normalized = slugifyStepId(stepId);
  if (!existingStepIds.includes(normalized)) {
    return normalized;
  }

  let counter = 2;
  while (existingStepIds.includes(`${normalized}-${counter}`)) {
    counter += 1;
  }
  return `${normalized}-${counter}`;
}

export function getEmptyWorkflowDraft(): WorkflowDraft {
  return {
    name: "",
    description: "",
    isPublic: false,
    steps: [],
    schedules: [],
  };
}

export function createStepDraft(
  tool?: WorkflowTool,
  existingStepIds: string[] = [],
  canvas?: { x: number; y: number },
): WorkflowStepDraft {
  const toolName = tool?.function.name ?? "";
  const label = tool ? friendlyToolName(tool.function.name) : "New step";
  return {
    localId: buildStepLocalId(),
    label,
    stepId: ensureUniqueStepId(label, existingStepIds),
    toolName,
    args: buildInitialArgs(tool?.function.parameters),
    resultLink: null,
    ...(canvas ? { canvasX: canvas.x, canvasY: canvas.y } : {}),
  };
}

/**
 * Resolved canvas position for a step at `index` in the workflow list.
 * Matches `ensureStepCanvasPositions` fallbacks so connectors, cards, and insert math stay aligned.
 */
export function resolveStepCanvasCoords(
  step: WorkflowStepDraft,
  index: number,
): { x: number; y: number } {
  return {
    x: step.canvasX ?? WORKFLOW_CANVAS_ORIGIN.x + index * WORKFLOW_CANVAS_STEP_SPACING_X,
    y: step.canvasY ?? WORKFLOW_CANVAS_ORIGIN.y,
  };
}

/** Fills missing canvas coordinates so steps appear on the board (horizontal chain from origin). */
export function ensureStepCanvasPositions(steps: WorkflowStepDraft[]): WorkflowStepDraft[] {
  if (steps.length === 0) return steps;
  let changed = false;
  const next = steps.map((s, i) => {
    if (s.canvasX != null && s.canvasY != null) return s;
    changed = true;
    const r = resolveStepCanvasCoords(s, i);
    return { ...s, canvasX: r.x, canvasY: r.y };
  });
  return changed ? next : steps;
}

/** Picks world coordinates for a new step inserted at `insertIndex`. */
export function computeInsertCanvasPosition(
  steps: WorkflowStepDraft[],
  insertIndex: number,
): { x: number; y: number } {
  const gap = 56;
  const stride = WORKFLOW_CANVAS_STEP_SPACING_X;
  if (steps.length === 0) {
    return { x: WORKFLOW_CANVAS_ORIGIN.x, y: WORKFLOW_CANVAS_ORIGIN.y };
  }
  if (insertIndex <= 0) {
    const first = resolveStepCanvasCoords(steps[0], 0);
    return { x: first.x - stride, y: first.y };
  }
  if (insertIndex >= steps.length) {
    const last = resolveStepCanvasCoords(steps[steps.length - 1], steps.length - 1);
    return { x: last.x + stride, y: last.y };
  }
  const left = resolveStepCanvasCoords(steps[insertIndex - 1], insertIndex - 1);
  const right = resolveStepCanvasCoords(steps[insertIndex], insertIndex);
  return { x: (left.x + right.x) / 2 - gap, y: (left.y + right.y) / 2 };
}

export function buildInitialArgs(schema?: ToolSchema): Record<string, unknown> {
  if (!schema || schema.type !== "object" || !schema.properties) {
    return {};
  }

  return Object.entries(schema.properties).reduce<Record<string, unknown>>((acc, [key, property]) => {
    acc[key] = buildInitialValue(property);
    return acc;
  }, {});
}

/** Coerce a metaData select option value to match the JSON Schema `type`. */
export function normalizeWorkflowFieldValueForSchema(schema: ToolSchema, raw: unknown): unknown {
  if (schema.type === "integer") {
    if (typeof raw === "number") return Math.round(raw);
    if (typeof raw === "boolean") return raw ? 1 : 0;
    const n = Number(raw);
    return Number.isFinite(n) ? Math.round(n) : 0;
  }
  if (schema.type === "number") {
    if (typeof raw === "number") return raw;
    const n = Number(raw);
    return Number.isFinite(n) ? n : 0;
  }
  if (schema.type === "boolean") {
    if (typeof raw === "boolean") return raw;
    if (raw === "true" || raw === true) return true;
    if (raw === "false" || raw === false) return false;
    return Boolean(raw);
  }
  if (raw === undefined || raw === null) return "";
  return String(raw);
}

function optionValueMatchesStored(optionValue: string | number | boolean, stored: unknown): boolean {
  if (Object.is(optionValue, stored)) return true;
  if (typeof optionValue === "number" && typeof stored === "number") {
    return optionValue === stored;
  }
  return String(optionValue) === String(stored);
}

/** String for a controlled `<select>` from current args value (matches an option by value). */
export function workflowSelectControlString(schema: ToolSchema, fieldValue: unknown): string {
  if (schema.metaData?.ui !== "select" || !schema.metaData.options?.length) {
    return "";
  }
  const hit = schema.metaData.options.find((o) => optionValueMatchesStored(o.value, fieldValue));
  if (hit) return String(hit.value);
  if (fieldValue === undefined || fieldValue === null) return "";
  return String(fieldValue);
}

/** Parse workflow dashboard select `onChange` into the value stored in `args`. */
export function parseWorkflowMetaSelectChange(schema: ToolSchema, selectedOptionString: string): unknown {
  const opts = schema.metaData?.options;
  if (!opts?.length) return selectedOptionString;
  const match = opts.find((o) => String(o.value) === selectedOptionString);
  const raw = match?.value ?? selectedOptionString;
  return normalizeWorkflowFieldValueForSchema(schema, raw);
}

function buildInitialValue(schema?: ToolSchema): unknown {
  if (!schema) return "";
  if (schema.default !== undefined) return schema.default;
  if (schema.enum?.length) return schema.enum[0];
  if (schema.metaData?.ui === "select" && schema.metaData.options?.length) {
    return normalizeWorkflowFieldValueForSchema(schema, schema.metaData.options[0].value);
  }

  if (schema.type === "boolean") return false;
  if (schema.type === "number" || schema.type === "integer") return 0;
  if (schema.type === "array") return [];
  if (schema.type === "object") {
    return Object.entries(schema.properties ?? {}).reduce<Record<string, unknown>>((acc, [key, property]) => {
      acc[key] = buildInitialValue(property);
      return acc;
    }, {});
  }
  return "";
}

/** Default value when adding an array item or inline field (same rules as new step args). */
export function buildWorkflowFieldInitialValue(schema?: ToolSchema): unknown {
  return buildInitialValue(schema);
}

export const DEFAULT_WORKFLOW_NAME = "Untitled workflow";


export function formatWorkflowDraftForApi(draft: WorkflowDraft): WorkflowPayload {
  return {
    name: draft.name.trim() || DEFAULT_WORKFLOW_NAME,
    description: draft.description.trim() || undefined,
    isPublic: draft.isPublic,
    steps: draft.steps.map((step, index) => {
      let args = cloneValue(step.args);

      if (step.resultLink?.sourceStepId && step.resultLink.targetPath) {
        args = setValueAtPath(
          args as Record<string, unknown>,
          step.resultLink.targetPath,
          createResultToken(step.resultLink.sourceStepId),
        );
      }

      return {
        stepId: step.stepId,
        toolName: step.toolName,
        label: step.label.trim() || undefined,
        args,
        canvasX: step.canvasX,
        canvasY: step.canvasY,
      };
    }),
    schedules: draft.schedules.map((schedule) => ({
      id: schedule.id,
      name: schedule.name.trim() || "Schedule",
      enabled: schedule.enabled,
      ruleType: schedule.mode === "once" ? "once" : "cron",
      expression: schedule.mode === "once"
        ? toIsoStringOrFallback(schedule.scheduledAt, new Date().toISOString())
        : buildCronExpression(schedule),
      timezone: schedule.timezone.trim() || detectUserTimezone(),
      createdAt: schedule.createdAt,
      updatedAt: schedule.updatedAt,
    })),
  };
}
