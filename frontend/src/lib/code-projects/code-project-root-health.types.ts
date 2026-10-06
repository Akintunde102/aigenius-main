export type CodeProjectRootHealthStatus =
  | 'ok'
  | 'missing'
  | 'not_directory'
  | 'permission_denied'
  | 'invalid_path'
  | 'unknown'
  | 'unavailable';

export type CodeProjectRootHealth = {
  projectId: string;
  rootPath: string;
  status: CodeProjectRootHealthStatus;
  ok: boolean;
  canRecreate: boolean;
  checkedAtIso: string;
};

export type CodeProjectRootCheckBridgeResult = {
  ok: boolean;
  status: string;
  canRecreate: boolean;
  resolvedPath?: string;
};
