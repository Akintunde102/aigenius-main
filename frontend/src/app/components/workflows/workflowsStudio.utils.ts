import { refreshAccessToken } from "@/lib/api/auth-client";
import {
  fetchWorkflow,
  fetchWorkflowRuns,
  fetchWorkflowToolsCached,
  WorkflowsApiError,
} from "./workflowsApi";
import { VIEWPORT_MENU_PAD } from "./workflowsStudio.constants";

export function formatShortTime(d: Date) {
  return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export function formatDateTime(value?: string | null) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

export function isTerminalWorkflowRun(status?: string) {
  return status === "completed" || status === "failed" || status === "cancelled";
}

export function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

export function clampMenuToViewport(
  x: number,
  y: number,
  width: number,
  height: number,
  vw: number,
  vh: number,
) {
  const maxX = Math.max(VIEWPORT_MENU_PAD, vw - width - VIEWPORT_MENU_PAD);
  const maxY = Math.max(VIEWPORT_MENU_PAD, vh - height - VIEWPORT_MENU_PAD);
  return {
    x: Math.min(Math.max(VIEWPORT_MENU_PAD, x), maxX),
    y: Math.min(Math.max(VIEWPORT_MENU_PAD, y), maxY),
  };
}

export function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

export function isAuthProblem(error: unknown) {
  if (error instanceof WorkflowsApiError && error.statusCode === 401) {
    return true;
  }
  if (!(error instanceof Error)) {
    return false;
  }
  const message = error.message.toLowerCase();
  return message.includes("authentication required") || message.includes("authorization error");
}

export async function loadToolsOnly() {
  try {
    return await fetchWorkflowToolsCached();
  } catch (error) {
    if (!isAuthProblem(error)) {
      throw error;
    }
    await refreshAccessToken();
    return fetchWorkflowToolsCached();
  }
}

export async function loadWorkflowById(workflowId: string) {
  try {
    return await fetchWorkflow(workflowId);
  } catch (error) {
    if (!isAuthProblem(error)) {
      throw error;
    }
    await refreshAccessToken();
    return fetchWorkflow(workflowId);
  }
}

export async function loadWorkflowHistory(workflowId: string) {
  try {
    return await fetchWorkflowRuns(workflowId);
  } catch (error) {
    if (!isAuthProblem(error)) {
      throw error;
    }
    await refreshAccessToken();
    return fetchWorkflowRuns(workflowId);
  }
}
