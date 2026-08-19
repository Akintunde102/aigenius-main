import { dialog } from 'electron';
import type { BrowserWindow } from 'electron';
import {
  normalizeDesktopToolId,
  TOOL_PERMISSION_CATALOG,
} from './tool-permission-preferences';

const SHELL_APPROVAL_FALLBACK_PREVIEW_MAX = 2000;

export function buildShellApprovalFallbackDetail(command: string): string {
  const truncated = command.length > SHELL_APPROVAL_FALLBACK_PREVIEW_MAX;
  const preview =
    command.slice(0, SHELL_APPROVAL_FALLBACK_PREVIEW_MAX) +
    (truncated ? '\n… (truncated)' : '');
  const needsWarning =
    truncated || /[\n\u2028\u2029]/.test(command);
  const warning = needsWarning
    ? '\n\nNote: This preview may not show the full command. Approve only if you reviewed the entire command (including every line).'
    : '';
  return preview + warning;
}

/** Builds the Authorization header for requests to the local sidecar. Fail-closed: throws if the token was never injected. */
export function sidecarAuthHeaders(): Record<string, string> {
  const token = process.env.AIGENIUS_SECRET_TOKEN;
  if (!token) throw new Error('AIGENIUS_SECRET_TOKEN is not set');
  return { Authorization: `Bearer ${token}` };
}

export function toolHasDedicatedApprovalUi(tool: string): boolean {
  const id = normalizeDesktopToolId(tool);
  return id === 'local_shell' || id === 'local_apply_patch';
}

export function toolApprovalLabel(tool: string): string {
  const id = normalizeDesktopToolId(tool);
  const entry = TOOL_PERMISSION_CATALOG.find((t) => t.id === id);
  return entry?.label ?? id;
}

export async function confirmGenericToolExecution(
  parent: BrowserWindow | undefined,
  tool: string,
): Promise<boolean> {
  const label = toolApprovalLabel(tool);
  const detail = `The assistant wants to run "${label}" on your computer.`;
  if (parent) {
    const { response } = await dialog.showMessageBox(parent, {
      type: 'question',
      buttons: ['Cancel', 'Allow'],
      defaultId: 1,
      cancelId: 0,
      title: 'Local tool',
      message: `Allow ${label}?`,
      detail,
    });
    return response === 1;
  }
  const { response } = await dialog.showMessageBox({
    type: 'question',
    buttons: ['Cancel', 'Allow'],
    defaultId: 1,
    cancelId: 0,
    title: 'Local tool',
    message: `Allow ${label}?`,
    detail,
  });
  return response === 1;
}
