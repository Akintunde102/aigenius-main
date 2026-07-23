/**
 * Active chat's code-project scope (null = General — no project).
 * Updated when switching sessions or starting a new chat in a sidebar bucket.
 */
let chatProjectScopeId: string | null = null;

export function setChatProjectScopeId(projectId: string | null): void {
  chatProjectScopeId = projectId;
}

export function getChatProjectScopeId(): string | null {
  return chatProjectScopeId;
}

export function isGeneralChatScope(): boolean {
  return chatProjectScopeId == null;
}

/** For tests. */
export function resetChatProjectScopeForTests(): void {
  chatProjectScopeId = null;
}
