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

/** One row for workflow canvas step cards — human-readable arg summaries. */
export type WorkflowArgSummaryLine = {
  label: string;
  value: string;
};
