export const TOOLBOX_TOOL_NAMES = [
  'local_toolbox_search',
  'local_toolbox_get',
  'local_toolbox_run',
  'local_toolbox_save',
] as const;

export type ToolboxToolName = (typeof TOOLBOX_TOOL_NAMES)[number];

export type ToolboxScope = 'global' | 'project';

export type ToolboxRuntime = 'node' | 'python' | 'powershell' | 'bash';

export type ToolboxCapabilityFlag =
  | 'network'
  | 'deletes-files'
  | 'runs-commands'
  | 'credentials'
  | 'writes-files'
  | 'installs-software';

export type ToolboxFileInput = {
  path: string;
  content: string;
};

export type ToolboxCallContext = {
  activeCodeProjectId: string | null;
  activeCodeProjectRootPath: string | null;
  conversationId?: string;
  modelId?: string;
};

export type ToolboxSearchResult = {
  ok: true;
  matches: Array<{ scope: ToolboxScope; name: string; description: string }>;
  allTools?: Array<{ scope: ToolboxScope; name: string; description: string }>;
};

export type ToolboxGetResult =
  | {
      ok: true;
      scope: ToolboxScope;
      name: string;
      description: string;
      usageNotes: string;
      runtime: ToolboxRuntime;
      entry: string;
      flags: ToolboxCapabilityFlag[];
      keywords: string[];
    }
  | { ok: false; error: string; code?: string };

export type ToolboxRunResult =
  | { ok: true; exitCode: number; stdout: string; stderr: string }
  | { ok: false; error: string; code?: string };

export type ToolboxSaveResult =
  | { ok: true; id: string; version: number }
  | { ok: false; error: string; code?: string };

export type ToolboxToolRecord = {
  id: string;
  scope: ToolboxScope;
  projectId: string | null;
  name: string;
  description: string;
  keywords: string[];
  runtime: ToolboxRuntime;
  entry: string;
  os: string[] | null;
  flags: ToolboxCapabilityFlag[];
  approvedHash: string | null;
  pinned: boolean;
  archived: boolean;
  version: number;
  lastRunAt: string | null;
  createdAt: string;
  updatedAt: string;
};

/** IPC / renderer — duplicated in frontend (do not import desktop package). */
export type ToolboxApprovalFilePreview = {
  path: string;
  content: string;
};

export type ToolboxApprovalPayload = {
  kind: 'save' | 'run';
  toolName: string;
  scopeLabel: string;
  description?: string;
  usageNotes?: string;
  files: ToolboxApprovalFilePreview[];
  declaredFlags: string[];
  scannedFlags: string[];
  undeclaredFlags: string[];
  capabilityLabels: string[];
};

export type ToolboxApprovalRequest = {
  requestId: string;
  kind: 'toolbox';
  payload: ToolboxApprovalPayload;
};
