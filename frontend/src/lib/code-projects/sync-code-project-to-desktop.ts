import { getAigeniusDesktopBridgeFromBrowsingContext } from '@/lib/utils/desktop-runtime';
import { getActiveCodeProject, type ActiveCodeProjectSnapshot } from './active-code-project';
import { getChatProjectScopeId, getChatProjectScopeSnapshot } from './chat-project-scope';

let lastSyncedProjectId: string | null = null;
let lastSyncedRootPath: string | null = null;
let inFlightSync: Promise<void> | null = null;

/** Effective project for local desktop tools (chat scope wins over sidebar selection). */
export function resolveEffectiveCodeProjectForDesktop(): ActiveCodeProjectSnapshot | null {
  const scopeId = getChatProjectScopeId();
  if (!scopeId) {
    return null;
  }
  const scopeSnapshot = getChatProjectScopeSnapshot();
  if (scopeSnapshot?.id === scopeId) {
    return scopeSnapshot;
  }
  const active = getActiveCodeProject();
  if (active?.id === scopeId) {
    return active;
  }
  return null;
}

/**
 * Align Electron main-process workspace root with the active chat project scope.
 * Skips redundant IPC when the project id + root path are unchanged.
 */
export async function syncCodeProjectToDesktop(
  project?: ActiveCodeProjectSnapshot | null,
): Promise<void> {
  if (inFlightSync) {
    await inFlightSync;
  }

  const resolved = project === undefined ? resolveEffectiveCodeProjectForDesktop() : project;
  const projectId = resolved?.id ?? null;
  const rootPath = resolved?.rootPath?.trim() ?? null;

  if (projectId === lastSyncedProjectId && rootPath === lastSyncedRootPath) {
    return;
  }

  const bridge = getAigeniusDesktopBridgeFromBrowsingContext();
  if (!bridge?.setCodeProjectIndex) {
    return;
  }

  const payload =
    projectId && rootPath
      ? { projectId, rootPath }
      : null;

  const run = async (): Promise<void> => {
    try {
      const result = await bridge.setCodeProjectIndex!(payload);
      if (result?.ok === false) {
        return;
      }
      lastSyncedProjectId = projectId;
      lastSyncedRootPath = rootPath;
    } catch {
      /* best-effort — tools may still run with a stale desktop root */
    }
  };

  inFlightSync = run();
  try {
    await inFlightSync;
  } finally {
    inFlightSync = null;
  }
}

/** For tests. */
export function resetDesktopCodeProjectSyncStateForTests(): void {
  lastSyncedProjectId = null;
  lastSyncedRootPath = null;
  inFlightSync = null;
}
