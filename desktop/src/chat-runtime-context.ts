import os from 'os';
import { getRetrievalMemoryService } from './local-retrieval-memory';

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

  return {
    desktopHost,
    retrievalMemoryCatalog: {
      generatedAtIso: new Date().toISOString(),
      entries,
    },
  };
}
