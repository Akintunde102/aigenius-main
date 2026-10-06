import type { CodeProjectRootHealth } from './code-project-root-health.types';

let healthByProjectId: Record<string, CodeProjectRootHealth> = {};

/** Sync snapshot of latest desktop root health checks (updated by `useCodeProjectRootHealth`). */
export function setCodeProjectRootHealthMap(map: Record<string, CodeProjectRootHealth>): void {
  healthByProjectId = { ...map };
}

export function getCodeProjectRootHealth(projectId: string): CodeProjectRootHealth | undefined {
  if (!projectId) {
    return undefined;
  }
  return healthByProjectId[projectId];
}

/** For tests */
export function resetCodeProjectRootHealthStoreForTests(): void {
  healthByProjectId = {};
}
