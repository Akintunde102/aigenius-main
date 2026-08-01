import {
  setActiveCodeProject,
  type ActiveCodeProjectSnapshot,
} from './active-code-project';
import { setChatProjectScopeId } from './chat-project-scope';

/** Align chat scope + desktop active project with a session or sidebar bucket. */
export function applyChatProjectScopeFromSession(
  codeProjectId: string | null | undefined,
  snapshot?: ActiveCodeProjectSnapshot | null,
): void {
  const id = codeProjectId ?? null;
  setChatProjectScopeId(id, snapshot ?? null);

  if (!id) {
    setActiveCodeProject(null);
    return;
  }

  if (snapshot?.id === id) {
    setActiveCodeProject(snapshot);
  }
}
