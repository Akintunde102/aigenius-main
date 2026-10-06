import type {
  CodeProjectRootCheckBridgeResult,
  CodeProjectRootHealth,
  CodeProjectRootHealthStatus,
} from './code-project-root-health.types';

export function mapBridgeStatusToHealthStatus(status: string): CodeProjectRootHealthStatus {
  switch (status) {
    case 'ok':
      return 'ok';
    case 'missing':
      return 'missing';
    case 'not_directory':
      return 'not_directory';
    case 'permission_denied':
      return 'permission_denied';
    case 'invalid_path':
      return 'invalid_path';
    default:
      return 'unknown';
  }
}

export function buildCodeProjectRootHealth(
  projectId: string,
  rootPath: string,
  bridgeResult: CodeProjectRootCheckBridgeResult | null,
  checkedAtIso: string,
): CodeProjectRootHealth {
  if (!bridgeResult) {
    return {
      projectId,
      rootPath,
      status: 'unavailable',
      ok: false,
      canRecreate: false,
      checkedAtIso,
    };
  }
  const status = mapBridgeStatusToHealthStatus(bridgeResult.status);
  return {
    projectId,
    rootPath,
    status,
    ok: bridgeResult.ok === true,
    canRecreate: bridgeResult.canRecreate === true,
    checkedAtIso,
  };
}

export function isProjectFolderMissing(health: CodeProjectRootHealth | undefined): boolean {
  if (!health || health.ok) {
    return false;
  }
  return health.status === 'missing' || health.status === 'not_directory' || health.status === 'permission_denied';
}
