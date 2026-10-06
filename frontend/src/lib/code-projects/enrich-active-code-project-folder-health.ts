import type { CodeProjectRootHealth } from './code-project-root-health.types';

export type ActiveCodeProjectRuntimePayload = {
  id: string;
  name: string;
  rootPath: string;
  rules?: string;
  structuralDigest?: string;
  folderRootOk?: boolean;
  folderRootStatus?: string;
};

export function enrichActiveCodeProjectWithFolderHealth(
  payload: ActiveCodeProjectRuntimePayload | undefined,
  health: CodeProjectRootHealth | undefined,
): ActiveCodeProjectRuntimePayload | undefined {
  if (!payload) {
    return undefined;
  }
  if (!health || health.projectId !== payload.id) {
    return payload;
  }
  if (health.ok) {
    const { folderRootOk: _ok, folderRootStatus: _st, ...rest } = payload;
    return { ...rest, folderRootOk: true };
  }
  return {
    ...payload,
    folderRootOk: false,
    folderRootStatus: health.status,
  };
}
