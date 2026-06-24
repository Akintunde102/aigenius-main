/**
 * Optional UI hints on any JSON Schema property node under tool `parameters`:
 * top-level `properties`, nested objects, or `items` (array element schema).
 * Omitted when tools are sent to the LLM (server strips `metaData`).
 */
export type WorkflowSchemaSelectOption = {
  /** Stored in step `args` (coerced to match `type`: string, number, integer, boolean). */
  value: string | number | boolean;
  label?: string;
};

export type WorkflowSchemaPropertyMetaData = {
  /** Prepopulated dropdown in the workflow dashboard. */
  ui?: "select";
  options?: WorkflowSchemaSelectOption[];
};

export type ToolSchema = {
  type?: string;
  title?: string;
  description?: string;
  enum?: Array<string | number>;
  format?: string;
  items?: ToolSchema;
  properties?: Record<string, ToolSchema>;
  required?: string[];
  default?: unknown;
  metaData?: WorkflowSchemaPropertyMetaData;
};

/** Server sets this on integration-gated tools in the workflow tool list when `includeWorkflowUiMetadata` is used. */
export type WorkflowToolAvailability = {
  integration: "gmail" | "linkedin" | "pdf";
  ready: boolean;
  blockedReason?: string;
};

/** Mirrors backend `WorkflowToolResponse` / GET /tools for workflow chaining hints. */
export type WorkflowToolResponse = {
  summary: string;
  exampleJson?: string;
  resultJsonSchema?: Record<string, unknown>;
  chainingPaths?: string[];
};

export type WorkflowTool = {
  type: "function";
  function: {
    name: string;
    description?: string;
    parameters?: ToolSchema;
  };
  /** UI-only description from the tools API; richer than the LLM-facing function description. */
  workflowDescription?: string;
  /** UI-only examples from the tools API for the workflow "about tool" panel. */
  workflowExamples?: string[];
  /** Optional icon URL from the tools API (workflow UI). */
  iconUrl?: string;
  /** Lucide icon name from backend suite definition (`workflowInfoIcon`). */
  workflowInfoIcon?: string;
  workflowAvailability?: WorkflowToolAvailability;
  workflowToolResponse?: WorkflowToolResponse;
};

export type ResultLinkDraft = {
  sourceStepId: string;
  targetPath: string;
};

export type WorkflowStepDraft = {
  localId: string;
  label: string;
  stepId: string;
  toolName: string;
  args: Record<string, unknown>;
  resultLink?: ResultLinkDraft | null;
  /** Editor-only canvas position (not sent to the workflow API). */
  canvasX?: number;
  canvasY?: number;
};

/** Default origin for linear step layout on the studio canvas (world coordinates). */
export const WORKFLOW_CANVAS_ORIGIN = { x: 2400, y: 2400 };
export const WORKFLOW_CANVAS_STEP_SPACING_X = 360;

export type WorkflowScheduleDraft = {
  id: string;
  name: string;
  enabled: boolean;
  mode: "once" | "repeat";
  scheduledAt: string;
  repeatPreset: "daily" | "weekdays" | "weekly" | "interval" | "custom";
  repeatInterval: string;
  repeatUnit: "seconds" | "minutes" | "hours" | "months" | "years" | "decades" | "centuries";
  repeatTime: string;
  repeatWeekday: string;
  customCron: string;
  timezone: string;
  createdAt?: string;
  updatedAt?: string;
};

export type WorkflowScheduleRecord = {
  id: string;
  name: string;
  enabled: boolean;
  ruleType: "once" | "cron";
  expression: string;
  timezone: string;
  nextRunAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type WorkflowSchedulePayload = {
  id: string;
  name: string;
  enabled: boolean;
  ruleType: "once" | "cron";
  expression: string;
  timezone: string;
  createdAt?: string;
  updatedAt?: string;
};

export type WorkflowDraft = {
  workflowId?: string;
  name: string;
  description: string;
  isPublic: boolean;
  steps: WorkflowStepDraft[];
  schedules: WorkflowScheduleDraft[];
};

export type WorkflowPayload = {
  name: string;
  description?: string;
  isPublic: boolean;
  steps: Array<{
    stepId: string;
    toolName: string;
    label?: string;
    args: Record<string, unknown>;
    canvasX?: number;
    canvasY?: number;
  }>;
  schedules: WorkflowSchedulePayload[];
};

export type WorkflowValidation = {
  isValid: boolean;
  totalIssues: number;
  issues: string[];
};

/** Canonical placeholder inserted from the UI; resolved at run time to the previous step's output. */
export const LAST_RESULT_TOKEN = "{{ last }}";

/** Matches `{{ last }}`, `{{ last.subject }}`, `{{  last }}`, etc. */
export const LAST_RESULT_TOKEN_REGEX = /\{\{\s*last(?:\.[^}]*)?\s*\}\}/gi;

export const WORKFLOW_DRAFT_STORAGE_KEY = "workflow_builder_draft_v1";

function cloneValue<T>(value: T): T {
  if (typeof globalThis.structuredClone === "function") {
    return globalThis.structuredClone(value);
  }

  return JSON.parse(JSON.stringify(value)) as T;
}

export function friendlyToolName(toolName: string): string {
  return toolName
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

/** One row for workflow canvas step cards — human-readable arg summaries. */
export type WorkflowArgSummaryLine = {
  label: string;
  value: string;
};

const ARG_SUMMARY_MAX_LINES = 5;
const ARG_SUMMARY_MAX_STRING = 72;

function truncateArgSummaryString(s: string, max: number): string {
  const t = s.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, Math.max(0, max - 1))}…`;
}

function formatArgValueForSummary(
  value: unknown,
  resolveStepLabel: (stepId: string) => string | undefined,
): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "—";
  if (typeof value === "string") {
    const tokenStepId = detectTokenStepId(value);
    if (tokenStepId) {
      const label = resolveStepLabel(tokenStepId)?.trim();
      return label ? `← ${truncateArgSummaryString(label, 48)}` : "← Previous step result";
    }
    if (isOnlyLastResultToken(value)) {
      return "← Previous step";
    }
    if (stringContainsLastResultToken(value)) {
      const hinted = value.replace(/\{\{\s*last\s*\}\}/gi, "⟨previous⟩");
      return truncateArgSummaryString(hinted, ARG_SUMMARY_MAX_STRING);
    }
    if (value.trim() === "") return "(empty)";
    return truncateArgSummaryString(value, ARG_SUMMARY_MAX_STRING);
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return "No items";
    const first = value[0];
    if (value.length === 1 && typeof first === "object" && first !== null && !Array.isArray(first)) {
      return "1 item (object)";
    }
    return `${value.length} items`;
  }
  if (typeof value === "object") {
    const n = Object.keys(value as object).length;
    return n === 0 ? "{ }" : `${n} fields`;
  }
  return String(value);
}

/**
 * Builds short label/value lines for the workflow canvas card body, using JSON Schema titles when present.
 */
export function summarizeWorkflowStepArgsForDisplay(
  args: Record<string, unknown>,
  parametersSchema: ToolSchema | undefined,
  resolveStepLabel: (stepId: string) => string | undefined,
): WorkflowArgSummaryLine[] {
  const props = parametersSchema?.properties;
  const orderedKeys: string[] = [];
  if (props) {
    for (const k of Object.keys(props)) {
      if (Object.prototype.hasOwnProperty.call(args, k)) orderedKeys.push(k);
    }
  }
  for (const k of Object.keys(args)) {
    if (!orderedKeys.includes(k)) orderedKeys.push(k);
  }

  if (orderedKeys.length === 0) {
    return [{ label: "Values", value: "No fields yet — open the editor" }];
  }

  const lines: WorkflowArgSummaryLine[] = [];
  const cap = Math.min(orderedKeys.length, ARG_SUMMARY_MAX_LINES);
  for (let i = 0; i < cap; i++) {
    const key = orderedKeys[i];
    if (key === undefined) continue;
    const propSchema = props?.[key];
    const label = propSchema?.title?.trim() || friendlyToolName(key);
    const value = formatArgValueForSummary(args[key], resolveStepLabel);
    lines.push({ label, value });
  }

  if (orderedKeys.length > ARG_SUMMARY_MAX_LINES) {
    lines.push({
      label: "More",
      value: `+${orderedKeys.length - ARG_SUMMARY_MAX_LINES} in editor`,
    });
  }

  return lines;
}

export function categorizeTool(toolName: string): string {
  if (toolName.startsWith("serper_")) return "Search";
  if (toolName.startsWith("firecrawl_")) return "Web pages";
  if (toolName.startsWith("gmail_")) return "Gmail";
  if (toolName.startsWith("linkedin_")) return "LinkedIn";
  if (toolName.startsWith("keep_")) return "Notes";
  if (toolName === "web_fetch") return "Web pages";
  if (toolName === "call_model") return "AI thinking";
  if (toolName === "get_wallet_balance") return "Wallet";
  if (toolName.includes("pdf")) return "Documents";
  return "Other tools";
}

/** Inserts a token at the caret (or appends when `el` is null). Used by workflow dynamic value UI. */
export function insertTokenAtCaret(
  el: HTMLTextAreaElement | HTMLInputElement | null,
  value: string,
  token: string,
  onValueChange: (next: string) => void,
): void {
  if (!el) {
    onValueChange(value + token);
    return;
  }
  const start = typeof el.selectionStart === "number" ? el.selectionStart : value.length;
  const end = typeof el.selectionEnd === "number" ? el.selectionEnd : value.length;
  const next = value.slice(0, start) + token + value.slice(end);
  onValueChange(next);
  const caret = start + token.length;
  window.setTimeout(() => {
    el.focus();
    try {
      el.setSelectionRange(caret, caret);
    } catch {
      /* some input types omit setSelectionRange */
    }
  }, 0);
}

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

export function detectUserTimezone(): string {
  if (typeof Intl === "undefined" || typeof Intl.DateTimeFormat !== "function") {
    return "UTC";
  }

  try {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return typeof timezone === "string" && timezone.trim() ? timezone : "UTC";
  } catch {
    return "UTC";
  }
}

export function buildStableScheduleName(existingSchedules: Array<Pick<WorkflowScheduleDraft, "name">> = []): string {
  const used = new Set(
    existingSchedules
      .map((schedule) => schedule.name?.trim())
      .filter((name): name is string => Boolean(name)),
  );

  let index = 1;
  while (used.has(`Schedule ${index}`)) {
    index += 1;
  }
  return `Schedule ${index}`;
}

export function getEmptyScheduleDraft(existingSchedules: Array<Pick<WorkflowScheduleDraft, "name">> = []): WorkflowScheduleDraft {
  return {
    id: `schedule-${Math.random().toString(36).slice(2, 10)}`,
    name: buildStableScheduleName(existingSchedules),
    enabled: false,
    mode: "once",
    scheduledAt: "",
    repeatPreset: "daily",
    repeatInterval: "1",
    repeatUnit: "minutes",
    repeatTime: "09:00",
    repeatWeekday: "1",
    customCron: "",
    timezone: detectUserTimezone(),
  };
}

export function hydrateScheduleDraftFromRecord(record?: WorkflowScheduleRecord | null): WorkflowScheduleDraft {
  if (!record) {
    return getEmptyScheduleDraft();
  }

  if (record.ruleType === "once") {
    return {
      id: record.id,
      name: record.name,
      enabled: record.enabled,
      mode: "once",
      scheduledAt: toDateTimeLocalValue(record.expression),
      repeatPreset: "daily",
      repeatInterval: "1",
      repeatUnit: "minutes",
      repeatTime: "09:00",
      repeatWeekday: "1",
      customCron: "",
      timezone: record.timezone,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }

  const cronSummary = describeCronExpression(record.expression);
  return {
    id: record.id,
    name: record.name,
    enabled: record.enabled,
    mode: "repeat",
    scheduledAt: "",
    repeatPreset: cronSummary.repeatPreset,
    repeatInterval: cronSummary.repeatInterval,
    repeatUnit: cronSummary.repeatUnit,
    repeatTime: cronSummary.repeatTime,
    repeatWeekday: cronSummary.repeatWeekday,
    customCron: cronSummary.customCron,
    timezone: record.timezone,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
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

function toDateTimeLocalValue(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }
  return parsed.toISOString().slice(0, 16);
}

function toIsoStringOrFallback(value: string, fallback: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return fallback;
  }
  return parsed.toISOString();
}

function formatScheduledAtForDisplay(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "Set a valid date and time";
  }
  return parsed.toLocaleString();
}

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

export function validateWorkflowDraft(draft: WorkflowDraft): WorkflowValidation {
  const issues: string[] = [];

  if (!draft.name.trim()) {
    issues.push("Give your workflow a name.");
  }

  if (draft.steps.length === 0) {
    issues.push("Add at least one step.");
  }

  const seenStepIds = new Set<string>();
  draft.steps.forEach((step, index) => {
    if (!step.toolName) {
      issues.push(`Choose a tool for Step ${index + 1}.`);
    }
    if (!step.label.trim()) {
      issues.push(`Give Step ${index + 1} a short name.`);
    }
    if (!step.stepId.trim()) {
      issues.push(`Step ${index + 1} is missing its saved ID.`);
    }
    if (seenStepIds.has(step.stepId)) {
      issues.push(`Step IDs must be unique. "${step.stepId}" is repeated.`);
    }
    seenStepIds.add(step.stepId);

    if (step.resultLink?.sourceStepId && step.resultLink.targetPath && index === 0) {
      issues.push("The first step cannot use an earlier step result.");
    }
    if (index === 0 && scanArgsForLastToken(step.args)) {
      issues.push("The first step cannot use {{ last }} — there is no previous step output.");
    }
  });

  draft.schedules.forEach((schedule, index) => {
    if (!schedule.name.trim()) {
      issues.push(`Give schedule ${index + 1} a short name.`);
    }
    if (!schedule.enabled) {
      return;
    }
    if (schedule.mode === "once" && !schedule.scheduledAt) {
      issues.push("Pick a date and time for your scheduled run.");
    }
    if (schedule.mode === "once" && schedule.scheduledAt && Number.isNaN(new Date(schedule.scheduledAt).getTime())) {
      issues.push("Use a valid date and time for your scheduled run.");
    }

    if (schedule.mode === "repeat") {
      if (schedule.repeatPreset === "interval") {
        const parsedInterval = Number.parseInt(schedule.repeatInterval, 10);
        if (!Number.isFinite(parsedInterval) || parsedInterval < 1) {
          issues.push("Use a whole number greater than 0 for the repeat interval.");
        }
        if (["years", "decades", "centuries"].includes(schedule.repeatUnit)) {
          issues.push("Years, decades, and centuries are not supported by cron schedules yet.");
        }
      }
      if (schedule.repeatPreset === "custom" && !schedule.customCron.trim()) {
        issues.push("Add a custom repeat rule or choose a simpler repeat option.");
      }
      if (
        schedule.repeatPreset !== "custom" &&
        schedule.repeatPreset !== "interval" &&
        !schedule.repeatTime
      ) {
        issues.push("Choose a repeat time.");
      }
      if (schedule.repeatPreset === "interval" && schedule.repeatUnit === "months" && !schedule.repeatTime) {
        issues.push("Choose a run time for monthly intervals.");
      }
    }
  });

  return {
    isValid: issues.length === 0,
    totalIssues: issues.length,
    issues,
  };
}

/** Validation for saving to the API (allows empty steps; name defaults in {@link formatWorkflowDraftForApi}). */
export function validateWorkflowDraftForRemotePersist(draft: WorkflowDraft): WorkflowValidation {
  const issues: string[] = [];

  const seenStepIds = new Set<string>();
  draft.steps.forEach((step, index) => {
    if (!step.toolName) {
      issues.push(`Choose a tool for Step ${index + 1}.`);
    }
    if (!step.label.trim()) {
      issues.push(`Give Step ${index + 1} a short name.`);
    }
    if (!step.stepId.trim()) {
      issues.push(`Step ${index + 1} is missing its saved ID.`);
    }
    if (seenStepIds.has(step.stepId)) {
      issues.push(`Step IDs must be unique. "${step.stepId}" is repeated.`);
    }
    seenStepIds.add(step.stepId);

    if (step.resultLink?.sourceStepId && step.resultLink.targetPath && index === 0) {
      issues.push("The first step cannot use an earlier step result.");
    }
    if (index === 0 && scanArgsForLastToken(step.args)) {
      issues.push("The first step cannot use {{ last }} — there is no previous step output.");
    }
  });

  draft.schedules.forEach((schedule, index) => {
    if (!schedule.name.trim()) {
      issues.push(`Give schedule ${index + 1} a short name.`);
    }
    if (!schedule.enabled) {
      return;
    }
    if (schedule.mode === "once" && !schedule.scheduledAt) {
      issues.push("Pick a date and time for your scheduled run.");
    }
    if (schedule.mode === "once" && schedule.scheduledAt && Number.isNaN(new Date(schedule.scheduledAt).getTime())) {
      issues.push("Use a valid date and time for your scheduled run.");
    }

    if (schedule.mode === "repeat") {
      if (schedule.repeatPreset === "interval") {
        const parsedInterval = Number.parseInt(schedule.repeatInterval, 10);
        if (!Number.isFinite(parsedInterval) || parsedInterval < 1) {
          issues.push("Use a whole number greater than 0 for the repeat interval.");
        }
        if (["years", "decades", "centuries"].includes(schedule.repeatUnit)) {
          issues.push("Years, decades, and centuries are not supported by cron schedules yet.");
        }
      }
      if (schedule.repeatPreset === "custom" && !schedule.customCron.trim()) {
        issues.push("Add a custom repeat rule or choose a simpler repeat option.");
      }
      if (
        schedule.repeatPreset !== "custom" &&
        schedule.repeatPreset !== "interval" &&
        !schedule.repeatTime
      ) {
        issues.push("Choose a repeat time.");
      }
      if (schedule.repeatPreset === "interval" && schedule.repeatUnit === "months" && !schedule.repeatTime) {
        issues.push("Choose a run time for monthly intervals.");
      }
    }
  });

  return {
    isValid: issues.length === 0,
    totalIssues: issues.length,
    issues,
  };
}

export function createLastResultToken(): string {
  return LAST_RESULT_TOKEN;
}

export function stringContainsLastResultToken(str: string): boolean {
  LAST_RESULT_TOKEN_REGEX.lastIndex = 0;
  return LAST_RESULT_TOKEN_REGEX.test(str);
}

export function isOnlyLastResultToken(value: unknown): boolean {
  return typeof value === "string" && /^\s*\{\{\s*last(?:\.[^}]*)?\s*\}\}\s*$/i.test(value);
}

/** True if any string anywhere in `args` contains `{{ last }}`. */
export function scanArgsForLastToken(value: unknown): boolean {
  if (typeof value === "string") {
    return stringContainsLastResultToken(value);
  }
  if (Array.isArray(value)) {
    return value.some((item) => scanArgsForLastToken(item));
  }
  if (value !== null && typeof value === "object") {
    return Object.values(value as Record<string, unknown>).some((v) => scanArgsForLastToken(v));
  }
  return false;
}

export function createResultToken(stepId: string): string {
  return `{{steps.${stepId}.result}}`;
}

export function detectTokenStepId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const match = value.match(/^\{\{steps\.([^.}]+)\.result\}\}$/);
  return match?.[1] ?? null;
}

export function getValueAtPath(value: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce<unknown>((current, key) => {
    if (current && typeof current === "object" && !Array.isArray(current)) {
      return (current as Record<string, unknown>)[key];
    }
    return undefined;
  }, value);
}

export function setValueAtPath(value: Record<string, unknown>, path: string, nextValue: unknown): Record<string, unknown> {
  const keys = path.split(".");
  const clone = cloneValue(value) as Record<string, unknown>;
  let pointer: Record<string, unknown> = clone;

  keys.forEach((key, index) => {
    if (index === keys.length - 1) {
      pointer[key] = nextValue;
      return;
    }

    const current = pointer[key];
    if (!current || typeof current !== "object" || Array.isArray(current)) {
      pointer[key] = {};
    }
    pointer = pointer[key] as Record<string, unknown>;
  });

  return clone;
}

export function removeValueAtPath(value: Record<string, unknown>, path: string): Record<string, unknown> {
  const keys = path.split(".");
  const clone = cloneValue(value) as Record<string, unknown>;
  let pointer: Record<string, unknown> = clone;

  keys.forEach((key, index) => {
    if (index === keys.length - 1) {
      pointer[key] = "";
      return;
    }
    const current = pointer[key];
    if (!current || typeof current !== "object" || Array.isArray(current)) {
      return;
    }
    pointer = current as Record<string, unknown>;
  });

  return clone;
}

export function listBindablePaths(schema?: ToolSchema, prefix = ""): Array<{ path: string; label: string }> {
  if (!schema) return [];

  if (schema.type === "object" && schema.properties) {
    return Object.entries(schema.properties).flatMap(([key, property]) => {
      const path = prefix ? `${prefix}.${key}` : key;
      if (property.type === "object") {
        return listBindablePaths(property, path);
      }
      if (property.type === "string") {
        return [{ path, label: property.title ?? friendlyToolName(path) }];
      }
      return [];
    });
  }

  return [];
}

export function buildCronExpression(schedule: WorkflowScheduleDraft): string {
  if (schedule.repeatPreset === "custom") {
    return schedule.customCron.trim();
  }

  if (schedule.repeatPreset === "interval") {
    const interval = Math.max(1, Number.parseInt(schedule.repeatInterval, 10) || 1);

    if (schedule.repeatUnit === "seconds") {
      return `*/${interval} * * * * *`;
    }
    if (schedule.repeatUnit === "minutes") {
      return `*/${interval} * * * *`;
    }
    if (schedule.repeatUnit === "hours") {
      return `0 */${interval} * * *`;
    }
    if (schedule.repeatUnit === "months") {
      const [hour = "9", minute = "0"] = schedule.repeatTime.split(":");
      return `${Number(minute)} ${Number(hour)} 1 */${interval} *`;
    }
  }

  const [hour = "9", minute = "0"] = schedule.repeatTime.split(":");

  if (schedule.repeatPreset === "weekdays") {
    return `${Number(minute)} ${Number(hour)} * * 1-5`;
  }

  if (schedule.repeatPreset === "weekly") {
    return `${Number(minute)} ${Number(hour)} * * ${schedule.repeatWeekday}`;
  }

  return `${Number(minute)} ${Number(hour)} * * *`;
}

function formatConfiguredScheduleSummary(schedule: WorkflowScheduleDraft): string {
  if (schedule.mode === "once" && schedule.scheduledAt) {
    return `Runs once on ${formatScheduledAtForDisplay(schedule.scheduledAt)}`;
  }

  if (schedule.mode === "repeat") {
    if (schedule.repeatPreset === "interval") {
      const amount = Number.parseInt(schedule.repeatInterval, 10) || 1;
      if (["years", "decades", "centuries"].includes(schedule.repeatUnit)) {
        return `Every ${amount} ${schedule.repeatUnit} is not supported by cron schedules yet`;
      }
      if (schedule.repeatUnit === "months") {
        return `Every ${amount} month${amount === 1 ? "" : "s"} on day 1 at ${schedule.repeatTime || "00:00"}`;
      }
      return `Every ${amount} ${schedule.repeatUnit}`;
    }
    if (schedule.repeatPreset === "custom") {
      return "Repeats with a custom rule";
    }
    if (schedule.repeatPreset === "weekdays") {
      return `Repeats every weekday at ${schedule.repeatTime}`;
    }
    if (schedule.repeatPreset === "weekly") {
      const weekdayLabels = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      return `Repeats every ${weekdayLabels[Number(schedule.repeatWeekday)]} at ${schedule.repeatTime}`;
    }
    return `Repeats every day at ${schedule.repeatTime}`;
  }

  return "Schedule ready";
}

export function formatScheduleSummary(schedule: WorkflowScheduleDraft): string {
  const summary = formatConfiguredScheduleSummary(schedule);

  if (!schedule.enabled) {
    if (summary === "Schedule ready") {
      return "No schedule yet";
    }
    return `Disabled · ${summary}`;
  }

  return summary;
}

export function formatIntervalScheduleLabel(schedule: Pick<WorkflowScheduleDraft, "repeatInterval" | "repeatUnit">): string {
  const amount = Math.max(1, Number.parseInt(schedule.repeatInterval, 10) || 1);
  const singularUnit = schedule.repeatUnit.endsWith("s")
    ? schedule.repeatUnit.slice(0, -1)
    : schedule.repeatUnit;
  return `Every ${amount} ${amount === 1 ? singularUnit : schedule.repeatUnit}`;
}

export function describeCronExpression(expression: string): Pick<WorkflowScheduleDraft, "repeatPreset" | "repeatInterval" | "repeatUnit" | "repeatTime" | "repeatWeekday" | "customCron"> {
  const trimmed = expression.trim();
  const parts = trimmed.split(/\s+/);
  if (parts.length !== 5 && parts.length !== 6) {
    return {
      repeatPreset: "custom",
      repeatInterval: "1",
      repeatUnit: "minutes",
      repeatTime: "09:00",
      repeatWeekday: "1",
      customCron: trimmed,
    };
  }
  const secondInterval = trimmed.match(/^\*\/(\d+)\s+\*\s+\*\s+\*\s+\*\s+\*$/);
  if (secondInterval) {
    return {
      repeatPreset: "interval",
      repeatInterval: secondInterval[1] ?? "1",
      repeatUnit: "seconds",
      repeatTime: "09:00",
      repeatWeekday: "1",
      customCron: "",
    };
  }
  const minuteInterval = trimmed.match(/^\*\/(\d+)\s+\*\s+\*\s+\*\s+\*$/);
  if (minuteInterval) {
    return {
      repeatPreset: "interval",
      repeatInterval: minuteInterval[1] ?? "1",
      repeatUnit: "minutes",
      repeatTime: "09:00",
      repeatWeekday: "1",
      customCron: "",
    };
  }
  const hourInterval = trimmed.match(/^0\s+\*\/(\d+)\s+\*\s+\*\s+\*$/);
  if (hourInterval) {
    return {
      repeatPreset: "interval",
      repeatInterval: hourInterval[1] ?? "1",
      repeatUnit: "hours",
      repeatTime: "09:00",
      repeatWeekday: "1",
      customCron: "",
    };
  }
  const monthlyInterval = trimmed.match(/^(\d+)\s+(\d+)\s+1\s+\*\/(\d+)\s+\*$/);
  if (monthlyInterval) {
    const minute = monthlyInterval[1] ?? "0";
    const hour = monthlyInterval[2] ?? "0";
    const interval = monthlyInterval[3] ?? "1";
    return {
      repeatPreset: "interval",
      repeatInterval: interval,
      repeatUnit: "months",
      repeatTime: `${hour.padStart(2, "0")}:${minute.padStart(2, "0")}`,
      repeatWeekday: "1",
      customCron: "",
    };
  }
  const baseParts = parts.length === 6 ? parts.slice(1) : parts;
  const [minute, hour, dayOfMonth, month, dayOfWeek] = baseParts;
  const repeatTime = `${String(Number(hour ?? 9)).padStart(2, "0")}:${String(Number(minute ?? 0)).padStart(2, "0")}`;
  if (dayOfMonth === "*" && month === "*") {
    if (dayOfWeek === "*") {
      return { repeatPreset: "daily", repeatInterval: "1", repeatUnit: "minutes", repeatTime, repeatWeekday: "1", customCron: "" };
    }
    if (dayOfWeek === "1-5") {
      return { repeatPreset: "weekdays", repeatInterval: "1", repeatUnit: "minutes", repeatTime, repeatWeekday: "1", customCron: "" };
    }
    if (/^[0-6]$/.test(dayOfWeek)) {
      return { repeatPreset: "weekly", repeatInterval: "1", repeatUnit: "minutes", repeatTime, repeatWeekday: dayOfWeek, customCron: "" };
    }
  }
  return {
    repeatPreset: "custom",
    repeatInterval: "1",
    repeatUnit: "minutes",
    repeatTime,
    repeatWeekday: "1",
    customCron: trimmed,
  };
}

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

/** Matches `workflow_step_runs.status` and runner SSE payloads. */
export type WorkflowStepRunStatus = "pending" | "running" | "completed" | "failed" | "skipped";

/** Human-readable step run status for UI (canvas cards, step config, screen readers). */
export function workflowStepRunStatusLabel(status: WorkflowStepRunStatus): string {
  switch (status) {
    case "pending":
      return "Pending";
    case "running":
      return "Running";
    case "completed":
      return "Completed";
    case "failed":
      return "Failed";
    case "skipped":
      return "Skipped";
    default:
      return String(status);
  }
}

/** Per-step snapshot for the workflow canvas (hydrated from GET run + SSE). */
export type WorkflowStepExecutionInfo = {
  status: WorkflowStepRunStatus;
  result?: string | null;
  error?: string | null;
  /** From SSE `invokeCode` or parsed tool result JSON `code` (e.g. wallet preflight). */
  invokeCode?: string | null;
  billedUsd?: number | null;
  walletAfter?: number | null;
};

function readJsonObject(value: string | null | undefined): Record<string, unknown> | undefined {
  if (value == null || value === "") {
    return undefined;
  }
  try {
    const parsed: unknown = JSON.parse(value);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return undefined;
    }
    return parsed as Record<string, unknown>;
  } catch {
    return undefined;
  }
}

function normalizeFiniteWorkflowNumber(value: unknown): number | undefined {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : undefined;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

/** Reads `code` from a tool result JSON string (e.g. insufficient-funds preflight payload). */
export function tryInvokeCodeFromToolResultJson(result: string | null | undefined): string | undefined {
  const code = readJsonObject(result)?.code;
  return typeof code === "string" && code.length > 0 ? code : undefined;
}

function tryReadErrorFromToolResultJson(result: string | null | undefined): string | undefined {
  const error = readJsonObject(result)?.error;
  return typeof error === "string" && error.trim().length > 0 ? error.trim() : undefined;
}

export function isBlockedWorkflowInvokeCode(invokeCode: string | null | undefined): boolean {
  return typeof invokeCode === "string" && invokeCode.startsWith("invokeTool::blocked");
}

export function normalizeWorkflowStepExecutionInfo(execution: WorkflowStepExecutionInfo): WorkflowStepExecutionInfo {
  const normalized: WorkflowStepExecutionInfo = {
    ...execution,
    billedUsd: normalizeFiniteWorkflowNumber(execution.billedUsd) ?? null,
    walletAfter: normalizeFiniteWorkflowNumber(execution.walletAfter) ?? null,
  };

  if (!isBlockedWorkflowInvokeCode(normalized.invokeCode) || normalized.status === "failed") {
    return normalized;
  }

  return {
    ...normalized,
    status: "failed",
    error: normalized.error?.trim() || tryReadErrorFromToolResultJson(normalized.result) || "Step blocked before execution.",
  };
}

export function formatWorkflowBilledUsd(value: number | null | undefined): string | null {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }
  if (value === 0) {
    return "$0.00";
  }
  if (value >= 0.01) {
    return `$${value.toFixed(2)}`;
  }
  return `$${value.toFixed(4)}`;
}

export function formatWorkflowWalletBalance(value: number | null | undefined): string | null {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * While a run is in progress, show flow on the connector only after the upstream step has finished
 * and the downstream step is still waiting (handoff to the next tool).
 */
export function shouldAnimateConnectorPipeFlow(
  playState: "idle" | "running",
  upstream?: WorkflowStepExecutionInfo,
  downstream?: WorkflowStepExecutionInfo,
): boolean {
  if (playState !== "running") return false;
  if (!upstream || !downstream) return false;
  return upstream.status === "completed" && downstream.status === "pending";
}

const WORKFLOW_RUN_OUTPUT_PREVIEW_MAX = 480;

/**
 * Pretty-prints JSON strings (e.g. minified tool results). Non-JSON text is returned unchanged.
 */
export function formatWorkflowToolOutputForDisplay(text: string): string {
  const t = text.trim();
  if (t.length === 0) {
    return text;
  }
  try {
    const parsed: unknown = JSON.parse(t);
    return JSON.stringify(parsed, null, 2);
  } catch {
    return text;
  }
}

/** Truncates long tool output for the collapsed card preview (UTF-16 safe). */
export function truncateWorkflowRunOutput(
  text: string,
  maxChars: number = WORKFLOW_RUN_OUTPUT_PREVIEW_MAX,
): { preview: string; truncated: boolean } {
  const t = text.trim();
  if (t.length <= maxChars) {
    return { preview: t, truncated: false };
  }
  return { preview: `${t.slice(0, maxChars).trimEnd()}…`, truncated: true };
}

/** SSE event shape from `GET .../workflows/:id/runs/:runId/stream` (Nest serializes `data` as JSON). */
export type WorkflowStepStreamEvent = {
  type: "step_started" | "step_completed" | "step_failed" | "run_completed" | "run_failed" | "run_cancelled";
  runId: string;
  stepIndex?: number;
  stepId?: string;
  toolName?: string;
  result?: string;
  error?: string;
  /** Preflight / dependency blocks from `invokeTool` (e.g. `invokeTool::blockedInsufficientFunds`). */
  invokeCode?: string;
  billedUsd?: number;
  walletAfter?: number;
};

export function parseWorkflowSseEventPayload(payload: string): WorkflowStepStreamEvent | null {
  if (!payload || payload === "[DONE]") {
    return null;
  }
  try {
    const value = JSON.parse(payload) as unknown;
    if (!value || typeof value !== "object") {
      return null;
    }
    const o = value as Record<string, unknown>;
    if (typeof o.type !== "string" || typeof o.runId !== "string") {
      return null;
    }
    return value as WorkflowStepStreamEvent;
  } catch {
    return null;
  }
}

/** Parses one SSE line (`data: …`). */
export function parseWorkflowSseDataLine(line: string): WorkflowStepStreamEvent | null {
  const trimmed = line.replace(/\r$/, "");
  if (!trimmed.startsWith("data:")) {
    return null;
  }
  return parseWorkflowSseEventPayload(trimmed.slice("data:".length).trimStart());
}
