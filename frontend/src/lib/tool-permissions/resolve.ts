import {
  getCatalogEntry,
  getPermissionCatalogForUi,
  isWorkflowTool,
  normalizeToolId,
  type ToolPermissionCatalogEntry,
} from './catalog';
import {
  DEFAULT_TOOL_PERMISSION_PREFERENCES,
  readToolPermissionPreferences,
  type StoredToolPermissionPreferences,
  writeToolPermissionPreferences,
} from './storage';

export type ToolPermissionState = {
  autoApproveAll: boolean;
  tools: Array<ToolPermissionCatalogEntry & { requiresApproval: boolean }>;
};

function defaultRequiresApproval(toolId: string): boolean {
  return getCatalogEntry(toolId)?.defaultRequiresApproval ?? false;
}

export function resolveRequiresApproval(
  prefs: StoredToolPermissionPreferences,
  tool: string,
): boolean {
  if (isWorkflowTool(tool)) {
    return false;
  }
  if (prefs.autoApproveAll) {
    return false;
  }
  const toolId = normalizeToolId(tool);
  if (Object.prototype.hasOwnProperty.call(prefs.requireApprovalByTool, toolId)) {
    return prefs.requireApprovalByTool[toolId];
  }
  return defaultRequiresApproval(toolId);
}

export function shouldRequireToolApproval(tool: string): boolean {
  const prefs = readToolPermissionPreferences();
  return resolveRequiresApproval(prefs, tool);
}

export function buildToolPermissionState(
  prefs: StoredToolPermissionPreferences = readToolPermissionPreferences(),
): ToolPermissionState {
  return {
    autoApproveAll: prefs.autoApproveAll,
    tools: getPermissionCatalogForUi().map((entry) => ({
      ...entry,
      requiresApproval: resolveRequiresApproval(prefs, entry.id),
    })),
  };
}

export function setAutoApproveAll(autoApproveAll: boolean): ToolPermissionState {
  const prefs = readToolPermissionPreferences();
  const next = { ...prefs, autoApproveAll };
  writeToolPermissionPreferences(next);
  return buildToolPermissionState(next);
}

export function setToolRequiresApproval(toolId: string, requiresApproval: boolean): ToolPermissionState {
  const normalizedId = normalizeToolId(toolId);
  const prefs = readToolPermissionPreferences();
  const next: StoredToolPermissionPreferences = {
    ...prefs,
    requireApprovalByTool: {
      ...prefs.requireApprovalByTool,
      [normalizedId]: requiresApproval,
    },
  };
  writeToolPermissionPreferences(next);
  return buildToolPermissionState(next);
}

export function resetToolPermissionPreferencesForTests(): void {
  writeToolPermissionPreferences({ ...DEFAULT_TOOL_PERMISSION_PREFERENCES });
}

export function isToolApprovalExempt(tool: string): boolean {
  return isWorkflowTool(tool);
}
