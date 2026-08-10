import {
  getActiveCodeProject,
  setActiveCodeProject,
  type ActiveCodeProjectSnapshot,
} from './active-code-project';
import { setChatProjectScopeId } from './chat-project-scope';
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
