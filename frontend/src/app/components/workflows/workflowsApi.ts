import axios from "axios";
import { authHttp, authorizedFetch } from "@/lib/api/auth-client";
import { LINKS } from "@/lib/links";
import {
  buildCronExpression,
  DEFAULT_WORKFLOW_NAME,
  detectUserTimezone,
  parseWorkflowSseDataLine,
  type WorkflowDraft,
  type WorkflowPayload,
  type WorkflowScheduleDraft,
  type WorkflowScheduleRecord,
  type WorkflowStepRunStatus,
  type WorkflowStepStreamEvent,
  type WorkflowTool,
} from "./workflowsUtils";

const WORKFLOWS_ENDPOINT = `${LINKS.noboxAPIRootUrl}/gateway/*/workflows`;
const TOOLS_ENDPOINT = `${LINKS.noboxAPIRootUrl}/gateway/*/tools`;

export type WorkflowRecord = {
  id: string;
  name: string;
  description?: string | null;
  isPublic?: boolean;
  steps: WorkflowPayload["steps"];
  schedules?: WorkflowPayload["schedules"];
  createdAt?: string;
  updatedAt?: string;
};

export class WorkflowsApiError extends Error {
  constructor(
    message: string,
    public readonly operation: string,
    public readonly statusCode?: number,
  ) {
    super(message);
    this.name = "WorkflowsApiError";
  }
}

/** Nest `AllExceptionsFilter` often sends `message` as a nested object (e.g. 401 auth). */
export function extractWorkflowApiServerMessage(data: unknown): string | undefined {
  if (!data || typeof data !== "object") {
    return undefined;
  }
  const d = data as Record<string, unknown>;

  if (typeof d.message === "string") {
    return d.message;
  }
  if (Array.isArray(d.message)) {
    return d.message.map(String).join(", ");
  }
  if (d.message && typeof d.message === "object") {
    const nested = d.message as Record<string, unknown>;
    if (typeof nested.message === "string") {
      return nested.message;
    }
    if (Array.isArray(nested.error)) {
      return nested.error.map(String).join(", ");
    }
  }
  if (typeof d.error === "string") {
    return d.error;
  }
  if (Array.isArray(d.error)) {
    return d.error.join(", ");
  }
  return undefined;
}

function mapAxiosError(error: unknown, operation: string, fallback: string) {
  if (axios.isCancel(error)) {
    throw error;
  }
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    const serverMessage = extractWorkflowApiServerMessage(error.response?.data);

    return new WorkflowsApiError(serverMessage ?? fallback, operation, status);
  }

  return new WorkflowsApiError(fallback, operation);
}

export async function fetchWorkflowTools(): Promise<WorkflowTool[]> {
  try {
    const response = await authHttp.get<{ tools: WorkflowTool[] }>(TOOLS_ENDPOINT, {
      headers: { "Content-Type": "application/json" },
    });

    return (response.data?.tools ?? []).filter((tool) => tool.type === "function");
  } catch (error) {
    throw mapAxiosError(error, "fetchWorkflowTools", "Could not load the workflow tools.");
  }
}

export async function fetchWorkflows(): Promise<WorkflowRecord[]> {
  try {
    const response = await authHttp.get<WorkflowRecord[]>(WORKFLOWS_ENDPOINT, {
      headers: { "Content-Type": "application/json" },
    });

    return Array.isArray(response.data) ? response.data : [];
  } catch (error) {
    throw mapAxiosError(error, "fetchWorkflows", "Could not load your workflows.");
  }
}

export async function fetchWorkflow(workflowId: string): Promise<WorkflowRecord> {
  try {
    const response = await authHttp.get<WorkflowRecord>(`${WORKFLOWS_ENDPOINT}/${workflowId}`, {
      headers: { "Content-Type": "application/json" },
    });

    return response.data;
  } catch (error) {
    throw mapAxiosError(error, "fetchWorkflow", "Could not open that workflow.");
  }
}

export async function createWorkflow(payload: WorkflowPayload): Promise<WorkflowRecord> {
  try {
    const response = await authHttp.post<WorkflowRecord>(WORKFLOWS_ENDPOINT, payload, {
      headers: { "Content-Type": "application/json" },
    });
    return response.data;
  } catch (error) {
    throw mapAxiosError(error, "createWorkflow", "Could not save your new workflow.");
  }
}

const EMPTY_WORKFLOW_SHELL: WorkflowPayload = {
  name: DEFAULT_WORKFLOW_NAME,
  isPublic: false,
  steps: [],
  schedules: [],
};

const WORKFLOW_SHELL_SESSION_KEY = "wf_bootstrap_shell_v1";
const WORKFLOW_SHELL_NAV_TOKEN_KEY = "wf_bootstrap_nav_v1";

function workflowSessionStorage(): Storage | null {
  try {
    if (typeof sessionStorage !== "undefined") {
      return sessionStorage;
    }
    return globalThis.sessionStorage ?? null;
  } catch {
    return null;
  }
}

let inflightShellCreate: Promise<WorkflowRecord> | null = null;
let memoryShellCache: WorkflowRecord | null = null;
let memoryShellNavToken: string | null = null;
let cachedWorkflowTools: WorkflowTool[] | null = null;
let inflightWorkflowTools: Promise<WorkflowTool[]> | null = null;

function readShellCache(): WorkflowRecord | null {
  const storage = workflowSessionStorage();
  if (storage) {
    const raw = storage.getItem(WORKFLOW_SHELL_SESSION_KEY);
    if (raw) {
      try {
        return JSON.parse(raw) as WorkflowRecord;
      } catch {
        storage.removeItem(WORKFLOW_SHELL_SESSION_KEY);
      }
    }
  }
  return memoryShellCache;
}

function writeShellCache(record: WorkflowRecord): void {
  memoryShellCache = record;
  workflowSessionStorage()?.setItem(WORKFLOW_SHELL_SESSION_KEY, JSON.stringify(record));
}

function readShellNavToken(): string | null {
  return workflowSessionStorage()?.getItem(WORKFLOW_SHELL_NAV_TOKEN_KEY) ?? memoryShellNavToken;
}

function writeShellNavToken(token: string): void {
  memoryShellNavToken = token;
  workflowSessionStorage()?.setItem(WORKFLOW_SHELL_NAV_TOKEN_KEY, token);
}

/** Clears persisted shell cache after a workflow studio session opens successfully. */
export function clearWorkflowShellBootstrapCache(): void {
  memoryShellCache = null;
  workflowSessionStorage()?.removeItem(WORKFLOW_SHELL_SESSION_KEY);
}

/** Full reset — use after a failed create or when abandoning an in-flight shell create. */
export function resetWorkflowShellBootstrap(): void {
  inflightShellCreate = null;
  memoryShellNavToken = null;
  clearWorkflowShellBootstrapCache();
  workflowSessionStorage()?.removeItem(WORKFLOW_SHELL_NAV_TOKEN_KEY);
}

/** Cached tools list — stable for the session; avoids refetch on every studio open. */
export async function fetchWorkflowToolsCached(): Promise<WorkflowTool[]> {
  if (cachedWorkflowTools) {
    return cachedWorkflowTools;
  }
  if (!inflightWorkflowTools) {
    inflightWorkflowTools = fetchWorkflowTools()
      .then((tools) => {
        cachedWorkflowTools = tools;
        inflightWorkflowTools = null;
        return tools;
      })
      .catch((error) => {
        inflightWorkflowTools = null;
        throw error;
      });
  }
  return inflightWorkflowTools;
}

export function invalidateWorkflowToolsCache(): void {
  cachedWorkflowTools = null;
  inflightWorkflowTools = null;
}

/**
 * Starts a new empty workflow on the server for `/workflows/new`.
 * Pass a per-navigation token (e.g. from `?fresh=`) so repeat clicks create a new row
 * while React Strict Mode remounts reuse the same in-flight or cached shell.
 */
export function beginNewWorkflowShell(navigationToken?: string | null): Promise<WorkflowRecord> {
  if (navigationToken) {
    const lastToken = readShellNavToken();
    if (lastToken !== navigationToken) {
      resetWorkflowShellBootstrap();
      writeShellNavToken(navigationToken);
    }
  } else if (!navigationToken && readShellCache() && !inflightShellCreate) {
    resetWorkflowShellBootstrap();
  }

  if (inflightShellCreate) {
    return inflightShellCreate;
  }

  const cachedShell = readShellCache();
  if (cachedShell) {
    return Promise.resolve(cachedShell);
  }

  inflightShellCreate = createWorkflow(EMPTY_WORKFLOW_SHELL).then((record) => {
    writeShellCache(record);
    inflightShellCreate = null;
    return record;
  });
  return inflightShellCreate;
}

/**
 * Returns the shell from the current `/workflows/new` session (Strict Mode remounts).
 * @deprecated Prefer `beginNewWorkflowShell` for explicit new-workflow navigation.
 */
export function ensureEmptyWorkflowOnServer(): Promise<WorkflowRecord> {
  const cachedShell = readShellCache();
  if (cachedShell) {
    return Promise.resolve(cachedShell);
  }
  return beginNewWorkflowShell();
}

export async function updateWorkflow(workflowId: string, payload: WorkflowPayload): Promise<WorkflowRecord> {
  try {
    const response = await authHttp.put<WorkflowRecord>(`${WORKFLOWS_ENDPOINT}/${workflowId}`, payload, {
      headers: { "Content-Type": "application/json" },
    });
    return response.data;
  } catch (error) {
    throw mapAxiosError(error, "updateWorkflow", "Could not save your changes.");
  }
}

export async function deleteWorkflow(workflowId: string): Promise<void> {
  try {
    await authHttp.delete(`${WORKFLOWS_ENDPOINT}/${workflowId}`, {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    throw mapAxiosError(error, "deleteWorkflow", "Could not delete that workflow.");
  }
}

export async function executeWorkflow(workflowId: string) {
  try {
    const response = await authHttp.post<{ runId: string; status: string }>(
      `${WORKFLOWS_ENDPOINT}/${workflowId}/execute`,
      {},
      { headers: { "Content-Type": "application/json" } },
    );
    return response.data;
  } catch (error) {
    throw mapAxiosError(error, "executeWorkflow", "Could not launch the workflow right now.");
  }
}

export async function cancelWorkflowRun(workflowId: string, runId: string) {
  try {
    const response = await authHttp.post<{ runId: string; status: string }>(
      `${WORKFLOWS_ENDPOINT}/${workflowId}/runs/${runId}/cancel`,
      {},
      { headers: { "Content-Type": "application/json" } },
    );
    return response.data;
  } catch (error) {
    throw mapAxiosError(error, "cancelWorkflowRun", "Could not stop the workflow run.");
  }
}

export async function deleteWorkflowRun(workflowId: string, runId: string): Promise<void> {
  try {
    await authHttp.delete(`${WORKFLOWS_ENDPOINT}/${workflowId}/runs/${runId}`, {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    throw mapAxiosError(error, "deleteWorkflowRun", "Could not delete that execution.");
  }
}

export async function deleteWorkflowRuns(workflowId: string, runIds: string[]): Promise<number> {
  try {
    const response = await authHttp.post<{ deleted?: number }>(
      `${WORKFLOWS_ENDPOINT}/${workflowId}/runs/delete`,
      { runIds },
      { headers: { "Content-Type": "application/json" } },
    );
    return Number(response.data?.deleted ?? 0);
  } catch (error) {
    throw mapAxiosError(error, "deleteWorkflowRuns", "Could not delete those executions.");
  }
}

type WorkflowStepRunRowWire = {
  stepId: string;
  stepIndex: number;
  toolName: string;
  status: WorkflowStepRunStatus;
  result?: string | null;
  error?: string | null;
  billedUsd?: number | string | null;
  walletAfter?: number | string | null;
};

export type WorkflowStepRunRow = {
  stepId: string;
  stepIndex: number;
  toolName: string;
  status: WorkflowStepRunStatus;
  result?: string | null;
  error?: string | null;
  billedUsd?: number | null;
  walletAfter?: number | null;
};

export type WorkflowRunDetailResponse = {
  run: {
    id: string;
    status: string;
    triggerType?: string;
    triggeringScheduleId?: string | null;
    triggeringScheduleName?: string | null;
    workflowSnapshot?: WorkflowRecord | null;
    error?: Record<string, unknown> | null;
  };
  steps: WorkflowStepRunRow[];
  failureSummary?: string | null;
};

export type WorkflowScheduleListItem = WorkflowScheduleRecord & {
  workflowId: string;
  workflowName: string;
};

function normalizeWorkflowStepRunRow(row: WorkflowStepRunRowWire): WorkflowStepRunRow {
  const billedUsd =
    typeof row.billedUsd === "number"
      ? row.billedUsd
      : typeof row.billedUsd === "string" && row.billedUsd.trim() !== ""
        ? Number(row.billedUsd)
        : null;
  const walletAfter =
    typeof row.walletAfter === "number"
      ? row.walletAfter
      : typeof row.walletAfter === "string" && row.walletAfter.trim() !== ""
        ? Number(row.walletAfter)
        : null;

  return {
    ...row,
    billedUsd: Number.isFinite(billedUsd as number) ? (billedUsd as number) : null,
    walletAfter: Number.isFinite(walletAfter as number) ? (walletAfter as number) : null,
  };
}

export type WorkflowRunListItem = {
  id: string;
  status: string;
  triggerType: "manual" | "scheduled" | "api";
  triggeringScheduleId?: string | null;
  triggeringScheduleName?: string | null;
  scheduledAt?: string | null;
  createdAt?: string;
  completedAt?: string | null;
  failureSummary?: string | null;
  error?: Record<string, unknown> | null;
  workflowSnapshot?: WorkflowRecord | null;
};

export async function fetchWorkflowRun(workflowId: string, runId: string, signal?: AbortSignal): Promise<WorkflowRunDetailResponse> {
  try {
    const response = await authHttp.get<Omit<WorkflowRunDetailResponse, "steps"> & { steps: WorkflowStepRunRowWire[] }>(
      `${WORKFLOWS_ENDPOINT}/${workflowId}/runs/${runId}`,
      { headers: { "Content-Type": "application/json" }, signal },
    );
    return {
      ...response.data,
      steps: Array.isArray(response.data?.steps) ? response.data.steps.map(normalizeWorkflowStepRunRow) : [],
    };
  } catch (error) {
    throw mapAxiosError(error, "fetchWorkflowRun", "Could not load run details.");
  }
}

export async function fetchWorkflowRuns(workflowId: string): Promise<WorkflowRunListItem[]> {
  try {
    const response = await authHttp.get<WorkflowRunListItem[]>(
      `${WORKFLOWS_ENDPOINT}/${workflowId}/runs`,
      { headers: { "Content-Type": "application/json" } },
    );
    return Array.isArray(response.data) ? response.data : [];
  } catch (error) {
    throw mapAxiosError(error, "fetchWorkflowRuns", "Could not load workflow history.");
  }
}

/**
 * Reads NestJS SSE until `run_completed` / `run_failed` / `run_cancelled` or the stream ends.
 * Abort the signal to stop reading (e.g. on unmount).
 */
export async function streamWorkflowRunEvents(
  workflowId: string,
  runId: string,
  onEvent: (event: WorkflowStepStreamEvent) => void,
  options?: { signal?: AbortSignal },
): Promise<void> {
  const url = `${WORKFLOWS_ENDPOINT}/${workflowId}/runs/${runId}/stream`;
  const response = await authorizedFetch(url, {
    method: "GET",
    headers: { Accept: "text/event-stream" },
    signal: options?.signal,
  });

  if (!response.ok) {
    let message = `Stream failed (${response.status})`;
    try {
      const text = await response.text();
      const parsed = JSON.parse(text) as unknown;
      message = extractWorkflowApiServerMessage(parsed) ?? message;
    } catch {
      /* keep default */
    }
    throw new WorkflowsApiError(message, "streamWorkflowRunEvents", response.status);
  }

  const body = response.body;
  if (!body) {
    throw new WorkflowsApiError("No response body for run stream.", "streamWorkflowRunEvents");
  }

  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        const event = parseWorkflowSseDataLine(line);
        if (!event) {
          continue;
        }
        onEvent(event);
        if (event.type === "run_completed" || event.type === "run_failed" || event.type === "run_cancelled") {
          return;
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

export async function scheduleWorkflow(workflowId: string, schedule: WorkflowScheduleDraft) {
  const payload = {
    id: schedule.id,
    name: schedule.name.trim() || "Schedule",
    enabled: schedule.enabled,
    ruleType: schedule.mode === "once" ? "once" : "cron",
    expression:
      schedule.mode === "once"
        ? new Date(schedule.scheduledAt).toISOString()
        : buildCronExpression(schedule),
    timezone: schedule.timezone,
    createdAt: schedule.createdAt,
    updatedAt: schedule.updatedAt,
  };
  try {
    const response = await authHttp.post(`${WORKFLOWS_ENDPOINT}/${workflowId}/schedule`, payload, {
      headers: { "Content-Type": "application/json" },
    });
    return response.data;
  } catch (error) {
    throw mapAxiosError(error, "scheduleWorkflow", "Could not save the schedule yet.");
  }
}

export async function fetchWorkflowSchedule(workflowId: string): Promise<WorkflowScheduleRecord> {
  try {
    const response = await authHttp.get<WorkflowScheduleRecord[]>(`${WORKFLOWS_ENDPOINT}/${workflowId}/schedule`, {
      headers: { "Content-Type": "application/json" },
    });
    return response.data[0] ?? {
      id: "schedule-empty",
      name: "No schedule",
      enabled: false,
      ruleType: "once",
      expression: "",
      timezone: detectUserTimezone(),
      nextRunAt: null,
    };
  } catch (error) {
    throw mapAxiosError(error, "fetchWorkflowSchedule", "Could not load the workflow schedule.");
  }
}

export async function clearWorkflowSchedule(workflowId: string): Promise<void> {
  try {
    await authHttp.delete(`${WORKFLOWS_ENDPOINT}/${workflowId}/schedule`, {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    throw mapAxiosError(error, "clearWorkflowSchedule", "Could not clear the workflow schedule.");
  }
}

export async function fetchAllSchedules(): Promise<WorkflowScheduleListItem[]> {
  try {
    const response = await authHttp.get<WorkflowScheduleListItem[]>(`${WORKFLOWS_ENDPOINT}/all-schedules`, {
      headers: { "Content-Type": "application/json" },
    });
    return Array.isArray(response.data) ? response.data : [];
  } catch (error) {
    throw mapAxiosError(error, "fetchAllSchedules", "Could not load all schedules.");
  }
}
