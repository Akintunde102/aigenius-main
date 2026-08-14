import {
  getActiveCodeProject,
  setActiveCodeProject,
  type ActiveCodeProjectSnapshot,
} from './active-code-project';
import {
  getChatProjectScopeId,
  setChatProjectScopeId,
} from './chat-project-scope';
import { syncCodeProjectToDesktop } from './sync-code-project-to-desktop';

/** Align chat scope + desktop active project with a session or sidebar bucket. */
export function applyChatProjectScopeFromSession(
  codeProjectId: string | null | undefined,
  snapshot?: ActiveCodeProjectSnapshot | null,
): void {
  const id = codeProjectId ?? null;
  setChatProjectScopeId(id, snapshot ?? null);

  if (!id) {
    setActiveCodeProject(null);
    void syncCodeProjectToDesktop(null);
    return;
  }

  const resolvedSnapshot =
    snapshot?.id === id
      ? snapshot
      : getActiveCodeProject()?.id === id
        ? getActiveCodeProject()
        : null;

  if (resolvedSnapshot) {
    setActiveCodeProject(resolvedSnapshot);
  } else {
    void syncCodeProjectToDesktop();
  }
}

/**
 * Before sending a message, align chat scope with the session being sent.
 * Existing conversations always use their persisted project; drafts use the bucket scope.
 */
export function enforceOutgoingChatProjectScope(
  sessionCodeProjectId: string | null | undefined,
  snapshot?: ActiveCodeProjectSnapshot | null,
): void {
  const expected = sessionCodeProjectId ?? null;
  const current = getChatProjectScopeId();
  if (current !== expected) {
    applyChatProjectScopeFromSession(expected, snapshot);
    return;
  }
  if (expected && snapshot?.id === expected) {
    applyChatProjectScopeFromSession(expected, snapshot);
  }
}

/** Sidebar highlight: open conversation's project, or draft bucket scope when no id yet. */
export function resolveSidebarActiveProjectId(
  currentSessionId: string | null,
  chatHistory: { id?: string; codeProjectId?: string | null }[],
): string | null {
  if (currentSessionId) {
    const session = chatHistory.find((s) => s.id === currentSessionId);
    if (session) {
      return session.codeProjectId ?? null;
    }
  }
  return getChatProjectScopeId();
}
