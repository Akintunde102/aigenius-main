/** Active code project root for default local_rag_query path_prefix (main process). */
let activeProjectRootPath: string | null = null;
let activeProjectId: string | null = null;

export function setActiveCodeProjectIndex(payload: {
  projectId: string;
  rootPath: string;
} | null): void {
  if (!payload) {
    activeProjectRootPath = null;
    activeProjectId = null;
    return;
  }
  activeProjectId = payload.projectId;
  activeProjectRootPath = payload.rootPath;
}

export function getActiveCodeProjectRootPath(): string | null {
  return activeProjectRootPath;
}

export function getActiveCodeProjectId(): string | null {
  return activeProjectId;
}
