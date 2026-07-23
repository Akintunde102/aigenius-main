import { app } from 'electron';
import fs from 'fs/promises';
import path from 'path';

const PREFERENCES_FILE = 'tool-permission-preferences.json';

export type StoredToolPermissionPreferences = {
  autoApproveAll: boolean;
  requireApprovalByTool: Record<string, boolean>;
};

export type ToolPermissionCatalogEntry = {
  id: string;
  label: string;
  description: string;
  defaultRequiresApproval: boolean;
  aliases?: string[];
};

/** Desktop-local tools only — server tool prefs are enforced in the web renderer. */
export const TOOL_PERMISSION_CATALOG: ToolPermissionCatalogEntry[] = [
  {
    id: 'local_shell',
    label: 'Run shell commands',
    description: 'Execute terminal commands on your computer',
    defaultRequiresApproval: true,
    aliases: ['run_command'],
  },
  {
    id: 'local_apply_patch',
    label: 'Apply file changes',
    description: 'Create, update, or delete files on disk',
    defaultRequiresApproval: true,
  },
  {
    id: 'local_retrieval_memory_upsert',
    label: 'Save retrieval memory',
    description: 'Write or update saved memory entries on disk',
    defaultRequiresApproval: true,
  },
  {
    id: 'local_read_file',
    label: 'Read local files',
    description: 'Read file contents from your machine',
    defaultRequiresApproval: false,
    aliases: ['read_file', 'read_local_file'],
  },
  {
    id: 'local_list_directory',
    label: 'List directories',
    description: 'Browse folders and files on your machine',
    defaultRequiresApproval: false,
  },
  {
    id: 'local_rag_query',
    label: 'Search indexed files',
    description: 'Query the local search index',
    defaultRequiresApproval: false,
  },
  {
    id: 'local_open_in_os',
    label: 'Open in system app',
    description: 'Open a file with the default OS application',
    defaultRequiresApproval: false,
  },
  {
    id: 'local_ollama_chat',
    label: 'Run local Ollama chat',
    description: 'Send prompts to a local Ollama model',
    defaultRequiresApproval: false,
  },
];

const DEFAULT_PREFERENCES: StoredToolPermissionPreferences = {
  autoApproveAll: false,
  requireApprovalByTool: {},
};

let cachedPreferences: StoredToolPermissionPreferences | null = null;

function preferencesPath(): string {
  return path.join(app.getPath('userData'), PREFERENCES_FILE);
}

function normalizeStored(raw: unknown): StoredToolPermissionPreferences {
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_PREFERENCES };
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

export function normalizeDesktopToolId(tool: string): string {
  const byId = TOOL_PERMISSION_CATALOG.find((entry) => entry.id === tool);
  if (byId) {
    return byId.id;
  }
  const byAlias = TOOL_PERMISSION_CATALOG.find((entry) => entry.aliases?.includes(tool));
  return byAlias?.id ?? tool;
}

function defaultRequiresApproval(toolId: string): boolean {
  const entry = TOOL_PERMISSION_CATALOG.find((t) => t.id === toolId);
  return entry?.defaultRequiresApproval ?? false;
}

function resolveRequiresApproval(
  prefs: StoredToolPermissionPreferences,
  toolId: string,
): boolean {
  if (prefs.autoApproveAll) {
    return false;
  }
  if (Object.prototype.hasOwnProperty.call(prefs.requireApprovalByTool, toolId)) {
    return prefs.requireApprovalByTool[toolId];
  }
  return defaultRequiresApproval(toolId);
}

function getActivePreferences(): StoredToolPermissionPreferences {
  return cachedPreferences ?? { ...DEFAULT_PREFERENCES };
}

async function persistPreferences(prefs: StoredToolPermissionPreferences): Promise<void> {
  const filePath = preferencesPath();
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(prefs, null, 2), 'utf8');
}

export async function loadToolPermissionPreferences(): Promise<StoredToolPermissionPreferences> {
  if (cachedPreferences) {
    return cachedPreferences;
  }
  try {
    const raw = await fs.readFile(preferencesPath(), 'utf8');
    cachedPreferences = normalizeStored(JSON.parse(raw));
  } catch {
    cachedPreferences = { ...DEFAULT_PREFERENCES };
  }
  return cachedPreferences;
}

export function applySyncedToolPermissionPreferences(prefs: unknown): StoredToolPermissionPreferences {
  cachedPreferences = normalizeStored(prefs);
  void persistPreferences(cachedPreferences);
  return cachedPreferences;
}

export function shouldRequireToolApproval(tool: string): boolean {
  const toolId = normalizeDesktopToolId(tool);
  return resolveRequiresApproval(getActivePreferences(), toolId);
}

/** Test-only: reset in-memory cache between specs. */
export function resetToolPermissionPreferencesCacheForTests(): void {
  cachedPreferences = null;
}
