import type { BrowserWindow } from 'electron';
import { getActiveCodeProjectId, getActiveCodeProjectRootPath } from '../active-code-project';
import { getToolboxService } from './service';
import { TOOLBOX_TOOL_NAMES, type ToolboxToolName } from './types';
import { app } from 'electron';

export function isToolboxTool(tool: string): boolean {
  return (TOOLBOX_TOOL_NAMES as readonly string[]).includes(tool);
}

function userDataDir(): string {
  return app.getPath('userData');
}

function callContext(): {
  activeCodeProjectId: string | null;
  activeCodeProjectRootPath: string | null;
} {
  return {
    activeCodeProjectId: getActiveCodeProjectId(),
    activeCodeProjectRootPath: getActiveCodeProjectRootPath(),
  };
}

export async function handleToolboxTool(
  senderWin: BrowserWindow | undefined,
  tool: ToolboxToolName,
  rawArgs: Record<string, unknown>,
): Promise<{ ok: true; result: string } | { ok: false; error: string }> {
  try {
    const svc = getToolboxService(userDataDir());
    const ctx = callContext();

    switch (tool) {
      case 'local_toolbox_search': {
        const query = typeof rawArgs.query === 'string' ? rawArgs.query : '';
        if (!query.trim()) {
          return { ok: false, error: 'query is required' };
        }
        const limit =
          typeof rawArgs.limit === 'number' ? rawArgs.limit : Number(rawArgs.limit) || 6;
        const res = await svc.search(query, limit, ctx);
        return { ok: true, result: JSON.stringify(res) };
      }
      case 'local_toolbox_get': {
        const name = typeof rawArgs.name === 'string' ? rawArgs.name : '';
        const res = await svc.get(name, ctx);
        return { ok: true, result: JSON.stringify(res) };
      }
      case 'local_toolbox_run': {
        const name = typeof rawArgs.name === 'string' ? rawArgs.name : '';
        const args = Array.isArray(rawArgs.args)
          ? rawArgs.args.filter((a): a is string => typeof a === 'string')
          : [];
        const timeout =
          typeof rawArgs.timeout_seconds === 'number'
            ? rawArgs.timeout_seconds
            : Number(rawArgs.timeout_seconds) || 60;
        const res = await svc.run(name, args, timeout, ctx, senderWin);
        return { ok: true, result: JSON.stringify(res) };
      }
      case 'local_toolbox_save': {
        const res = await svc.save(rawArgs, ctx, senderWin);
        return { ok: true, result: JSON.stringify(res) };
      }
      default:
        return { ok: false, error: 'unknown toolbox tool' };
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg };
  }
}
