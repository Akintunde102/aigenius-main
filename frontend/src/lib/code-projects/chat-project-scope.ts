import type { ActiveCodeProjectSnapshot } from './active-code-project';

/**
 * Active chat's code-project scope (null = General — no project).
 * Updated when switching sessions or starting a new chat in a sidebar bucket.
 */
let chatProjectScopeId: string | null = null;
let chatProjectScopeSnapshot: ActiveCodeProjectSnapshot | null = null;

export function setChatProjectScopeId(
  projectId: string | null,
  snapshot?: ActiveCodeProjectSnapshot | null,
): void {
  chatProjectScopeId = projectId;
  if (!projectId) {
    chatProjectScopeSnapshot = null;
    return;
  }
  if (snapshot?.id === projectId) {
    chatProjectScopeSnapshot = snapshot;
  }
}

export function getChatProjectScopeId(): string | null {
  return chatProjectScopeId;
}

/** Project metadata for the active chat scope (when known). */
export function getChatProjectScopeSnapshot(): ActiveCodeProjectSnapshot | null {
  if (!chatProjectScopeId || chatProjectScopeSnapshot?.id !== chatProjectScopeId) {
    return null;
  }
  return chatProjectScopeSnapshot;
}

export function isGeneralChatScope(): boolean {
  return chatProjectScopeId == null;
}

/** For tests. */
export function resetChatProjectScopeForTests(): void {
  chatProjectScopeId = null;
  chatProjectScopeSnapshot = null;
}
