import { loopbackHttpOrigin } from './loopback-host';
import { MINI_SERVER_PORT } from './mini-server-port';
import { sidecarFetch } from './sidecar-fetch';
import { sidecarAuthHeaders } from './local-tool-executor-helpers';

const SERVER_URL = loopbackHttpOrigin(MINI_SERVER_PORT);

export type SidecarToolResponse =
  | { ok: true; result: string; rawData?: unknown }
  | { ok: false; error: string };

/** When false, local-tool-executor runs grep/git/read in the main process. */
export function sidecarToolsEnabled(): boolean {
  if (process.env.NODE_ENV === 'test') {
    return false;
  }
  return process.env.AIGENIUS_TOOLS_VIA_SIDECAR !== '0';
}

/**
 * Sidecar handlers are a subset of main-process tools. Skip routing when the
 * richer executor should handle the request (batch reads, line windows, project cwd, etc.).
 */
export function shouldRouteToolViaSidecar(
  tool: string,
  args: Record<string, unknown>,
): boolean {
  if (!sidecarToolsEnabled()) {
    return false;
  }

  switch (tool) {
    case 'local_read_file':
    case 'read_file':
      if (Array.isArray(args.reads) && args.reads.length > 0) {
        return false;
      }
      if (typeof args.start_line === 'number' || typeof args.max_lines === 'number') {
        return false;
      }
      if (typeof args.offset === 'number' || typeof args.limit === 'number') {
        return false;
      }
      if (typeof args.anchorSymbol === 'string' && args.anchorSymbol.trim()) {
        return false;
      }
      if (args.mode !== undefined) {
        return false;
      }
      return typeof args.path === 'string' && args.path.trim().length > 0;
    case 'local_git_status':
    case 'local_git_diff':
      // Main process resolves the active code project when cwd is omitted.
      return typeof args.cwd === 'string' && args.cwd.trim().length > 0;
    case 'local_grep':
      if (args.case_insensitive === true) {
        return false;
      }
      if (args.multiline === true) {
        return false;
      }
      if (args.output_mode && args.output_mode !== 'content') {
        return false;
      }
      if (typeof args.type === 'string' && args.type.trim()) {
        return false;
      }
      if (Array.isArray(args.extensions) && args.extensions.length > 0) {
        return false;
      }
      if (typeof args.glob === 'string' && args.glob.trim()) {
        return false;
      }
      if (
        typeof args.context_before === 'number'
        || typeof args.context_after === 'number'
        || typeof args.context_around === 'number'
      ) {
        return false;
      }
      return typeof args.pattern === 'string'
        && args.pattern.trim().length > 0
        && (
          (typeof args.path === 'string' && args.path.trim().length > 0)
          || (typeof args.path_prefix === 'string' && args.path_prefix.trim().length > 0)
        );
    case 'local_shell':
    case 'run_command':
      return true;
    default:
      return false;
  }
}

export async function executeSidecarTool(
  tool: string,
  args: Record<string, unknown>,
): Promise<SidecarToolResponse | null> {
  if (!shouldRouteToolViaSidecar(tool, args)) {
    return null;
  }
  try {
    const res = await sidecarFetch(`${SERVER_URL}/tools/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...sidecarAuthHeaders() },
      body: JSON.stringify({ tool, arguments: args }),
    });
    const data = (await res.json().catch(() => ({}))) as SidecarToolResponse & { error?: string };
    if (!res.ok) {
      console.warn(
        '[aigenius-desktop] sidecar tool HTTP error; falling back to main process:',
        tool,
        data.error ?? res.status,
      );
      return null;
    }
    if (data.ok === true && typeof data.result === 'string') {
      return { ok: true, result: data.result, rawData: data.rawData };
    }
    console.warn(
      '[aigenius-desktop] sidecar tool logical error; falling back to main process:',
      tool,
      data.error ?? 'invalid response',
    );
    return null;
  } catch (err) {
    console.warn('[aigenius-desktop] sidecar tool failed; falling back to main process:', tool, err);
    return null;
  }
}
