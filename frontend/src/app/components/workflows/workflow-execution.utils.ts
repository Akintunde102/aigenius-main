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
 * Sanitizes technical error messages (e.g. OpenRouter upstream 402/401/429 JSON dumps, API keys, internal URLs)
 * into clean, user-facing error messages suitable for toasts and step status cards.
 */
export function sanitizeWorkflowErrorMessage(rawError: string | null | undefined): string {
  if (!rawError) return "An unexpected error occurred.";

  const text = String(rawError).trim();
  if (!text) return "An unexpected error occurred.";

  // Detect OpenRouter or Upstream Model Provider Key/Credit limits (402 Payment Required)
  if (
    /openrouter_key_limit/i.test(text) ||
    /402\s*Payment\s*Required/i.test(text) ||
    /more credits, or fewer max_tokens/i.test(text) ||
    /adjust the key's total limit/i.test(text) ||
    /remedy_hint/i.test(text)
  ) {
    return "AI model service is temporarily unavailable. Please try again shortly or contact support.";
  }

  // Detect 401 Unauthorized / Invalid API Key
  if (
    /(?:OpenRouter|Model API).*401/i.test(text) ||
    /Invalid API Key/i.test(text) ||
    /401\s*Unauthorized/i.test(text)
  ) {
    return "AI model service authentication issue. Please contact support.";
  }

  // Detect 429 Rate Limit
  if (
    /(?:OpenRouter|Model API).*429/i.test(text) ||
    /Rate limit/i.test(text) ||
    /429\s*Too Many Requests/i.test(text)
  ) {
    return "AI model rate limit reached. Please wait a moment and try again.";
  }

  // Upstream model API errors or internal provider URLs in raw dumps
  if (/(?:OpenRouter|Model API) API error/i.test(text) || /https:\/\/openrouter\.ai/i.test(text)) {
    return "AI model service is temporarily unavailable. Please try again shortly.";
  }

  // Strip raw URLs from generic error messages to prevent spilling key/workspace links
  let sanitized = text.replace(/https?:\/\/[^\s]+/g, "").trim();

  // If the error message was just a raw JSON string like {"error":...}, try extracting message field
  if (sanitized.startsWith("{") && sanitized.endsWith("}")) {
    try {
      const parsed = JSON.parse(sanitized) as Record<string, unknown>;
      const errObj = parsed?.error as Record<string, unknown> | undefined;
      if (errObj?.message && typeof errObj.message === "string") {
        return sanitizeWorkflowErrorMessage(errObj.message);
      }
      if (parsed?.message && typeof parsed.message === "string") {
        return sanitizeWorkflowErrorMessage(parsed.message);
      }
    } catch {
      /* fallback */
    }
  }

  return sanitized || "An unexpected error occurred.";
}

/**
 * Pretty-prints JSON strings (e.g. minified tool results). Non-JSON text is returned unchanged.
 */
export function formatWorkflowToolOutputForDisplay(text: string): string {
  const t = text.trim();
  if (t.length === 0) {
    return text;
  }
  // Sanitize if it's an error payload / dump
  const sanitized = sanitizeWorkflowErrorMessage(t);
  if (sanitized !== t) {
    return sanitized;
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
