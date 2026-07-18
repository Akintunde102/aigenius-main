export type StoredToolPermissionPreferences = {
  autoApproveAll: boolean;
  requireApprovalByTool: Record<string, boolean>;
};

export const TOOL_PERMISSION_STORAGE_KEY = 'aigenius_tool_permission_preferences_v1';

export const DEFAULT_TOOL_PERMISSION_PREFERENCES: StoredToolPermissionPreferences = {
  autoApproveAll: false,
  requireApprovalByTool: {},
};

export function normalizeStoredPreferences(raw: unknown): StoredToolPermissionPreferences {
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_TOOL_PERMISSION_PREFERENCES };
  }
  const o = raw as Record<string, unknown>;
  const autoApproveAll = o.autoApproveAll === true;
  const requireApprovalByTool: Record<string, boolean> = {};
  if (o.requireApprovalByTool && typeof o.requireApprovalByTool === 'object') {
    for (const [key, value] of Object.entries(o.requireApprovalByTool as Record<string, unknown>)) {
      if (typeof value === 'boolean') {
        requireApprovalByTool[key] = value;
      }
    }
  }
  return { autoApproveAll, requireApprovalByTool };
}

export function readToolPermissionPreferences(): StoredToolPermissionPreferences {
  if (typeof window === 'undefined') {
    return { ...DEFAULT_TOOL_PERMISSION_PREFERENCES };
  }
  try {
    const raw = window.localStorage.getItem(TOOL_PERMISSION_STORAGE_KEY);
    if (!raw) {
      return { ...DEFAULT_TOOL_PERMISSION_PREFERENCES };
    }
    return normalizeStoredPreferences(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_TOOL_PERMISSION_PREFERENCES };
  }
}

export function writeToolPermissionPreferences(prefs: StoredToolPermissionPreferences): void {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    window.localStorage.setItem(TOOL_PERMISSION_STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    /* ignore quota / private mode */
  }
}
