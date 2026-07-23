import os from 'os';
import path from 'path';
import { getRetrievalMemoryService } from './local-retrieval-memory';
import { getActiveCodeProjectId, getActiveCodeProjectRootPath } from './active-code-project';
import { loopbackHttpUrl } from './loopback-host';

/** Resolved once when the main process loads this module (Electron app startup). */
export const USER_HOME_DIR_AT_STARTUP = os.homedir();

export type RetrievalMemoryCatalogEntryIpc = {
  slug: string;
  name: string;
  description: string;
  tags: string[];
};

export async function getChatRuntimeContextForIpc(): Promise<{
  desktopHost: {
    platform: string;
    arch: string;
    release: string;
    userHomeDir: string;
  };
  retrievalMemoryCatalog: { generatedAtIso: string; entries: RetrievalMemoryCatalogEntryIpc[] };
  structuralDigest?: string;
}> {
  const desktopHost = {
    platform: process.platform,
    arch: process.arch,
    release: os.release(),
    userHomeDir: USER_HOME_DIR_AT_STARTUP,
  };

  let entries: RetrievalMemoryCatalogEntryIpc[] = [];
  try {
    const mem = getRetrievalMemoryService();
    await mem.ensurePromptCatalogHydrated();
    entries = mem.getCatalogEntriesForPrompt();
  } catch {
    entries = [];
  }

  let structuralDigest: string | undefined;
  const projectRoot = getActiveCodeProjectRootPath();
  if (projectRoot) {
    try {
      const port = process.env.AIGENIUS_MINI_SERVER_PORT ?? '8001';
      const token = process.env.AIGENIUS_SECRET_TOKEN;
      if (token) {
        const projectName = path.basename(projectRoot) || getActiveCodeProjectId() || 'Project';
        const url = loopbackHttpUrl(
          port,
          `/search/structural-digest?root=${encodeURIComponent(projectRoot)}&projectName=${encodeURIComponent(projectName)}`,
        );
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = (await res.json()) as { digest?: string };
          if (data.digest?.trim()) structuralDigest = data.digest.trim();
        }
      }
    } catch {
      /* best-effort */
    }
  }

  return {
    desktopHost,
    retrievalMemoryCatalog: {
      generatedAtIso: new Date().toISOString(),
      entries,
    },
    ...(structuralDigest ? { structuralDigest } : {}),
  };
}
