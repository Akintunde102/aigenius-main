import os from 'os';
import { getRetrievalMemoryService } from './local-retrieval-memory';
import { getLocalToolCapabilities } from './tool-capabilities';
import { isDesktopToolboxEnabledInMain } from './electron/toolbox-env';
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
    activeShell?: string;
  };
  retrievalMemoryCatalog: { generatedAtIso: string; entries: RetrievalMemoryCatalogEntryIpc[] };
  localToolCapabilities: ReturnType<typeof getLocalToolCapabilities>;
  desktopToolboxEnabled: boolean;
}> {
  const desktopHost = {
    platform: process.platform,
    arch: process.arch,
    release: os.release(),
    userHomeDir: USER_HOME_DIR_AT_STARTUP,
    activeShell: process.platform === 'win32' ? 'PowerShell (powershell.exe / pwsh)' : (process.env.SHELL || '/bin/sh'),
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
    localToolCapabilities: getLocalToolCapabilities(),
    desktopToolboxEnabled: isDesktopToolboxEnabledInMain(),
  };
}
