import { ipcMain } from 'electron';
import { loopbackHttpOrigin } from '../loopback-host';

const MINI_SERVER_PORT = process.env.AIGENIUS_MINI_SERVER_PORT ?? '8001';
const SERVER_URL = loopbackHttpOrigin(MINI_SERVER_PORT);

/** Returns the auth header value; throws if the token was never injected. */
function authHeader(): { Authorization: string } {
  const token = process.env.AIGENIUS_SECRET_TOKEN;
  if (!token) throw new Error('AIGENIUS_SECRET_TOKEN is not set in Electron env');
  return { Authorization: `Bearer ${token}` };
}

/**
 * Registers all search-related IPC channels.
 * Proxies calls to the local desktop-server (sidecar) via HTTP.
 */
export function registerIpcHandlers(): void {
  // search:query — Proxies FTS5 query to sidecar
  ipcMain.handle(
    'search:query',
    async (_event, payload: { term?: string; limit?: number }) => {
      try {
        const res = await fetch(`${SERVER_URL}/search/query`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...authHeader() },
          body: JSON.stringify(payload),
        });
        return await res.json();
      } catch (err) {
        console.error('[aigenius-desktop][proxy] search:query failed — is the sidecar running?', err);
        return { results: [], error: true };
      }
    },
  );

  // search:status — Proxies status retrieval to sidecar
  ipcMain.handle('search:status', async () => {
    try {
      const res = await fetch(`${SERVER_URL}/search/status`, {
        headers: authHeader(),
      });
      return await res.json();
    } catch (err) {
      console.error('[aigenius-desktop][proxy] search:status failed — is the sidecar running?', err);
      return { indexed: 0, watching: false, lastRun: 0, error: true };
    }
  });

  // search:reindex — Proxies reindexing request to sidecar
  ipcMain.handle(
    'search:reindex',
    async (_event, payload: { paths?: string[] }) => {
      try {
        const res = await fetch(`${SERVER_URL}/search/reindex`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...authHeader() },
          body: JSON.stringify(payload),
        });
        return await res.json();
      } catch (err) {
        console.error('[aigenius-desktop][proxy] search:reindex failed — is the sidecar running?', err);
        return { queued: 0, error: true };
      }
    },
  );

  ipcMain.handle(
    'search:index-project',
    async (_event, payload: { rootPath: string; force?: boolean }) => {
      try {
        const res = await fetch(`${SERVER_URL}/search/index-project`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...authHeader() },
          body: JSON.stringify(payload),
        });
        return await res.json();
      } catch (err) {
        console.error('[aigenius-desktop][proxy] search:index-project failed', err);
        return { queued: 0, error: true };
      }
    },
  );

  // search:remove — Proxies file removal request to sidecar
  ipcMain.handle(
    'search:remove',
    async (_event, payload: { path?: string }) => {
      try {
        const res = await fetch(`${SERVER_URL}/search/remove`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...authHeader() },
          body: JSON.stringify(payload),
        });
        return await res.json();
      } catch (err) {
        console.error('[aigenius-desktop][proxy] search:remove failed — is the sidecar running?', err);
        return { ok: false, error: true };
      }
    },
  );

  ipcMain.handle('search:browse', async (_event, payload: Record<string, unknown> | undefined) => {
    try {
      const res = await fetch(`${SERVER_URL}/search/browse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader() },
        body: JSON.stringify(payload ?? {}),
      });
      return await res.json();
    } catch (err) {
      console.error('[aigenius-desktop][proxy] search:browse failed — is the sidecar running?', err);
      return { rows: [], total: 0, error: true };
    }
  });

  ipcMain.handle('search:folders', async (_event, payload: Record<string, unknown> | undefined) => {
    try {
      const res = await fetch(`${SERVER_URL}/search/folders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader() },
        body: JSON.stringify(payload ?? {}),
      });
      return await res.json();
    } catch (err) {
      console.error('[aigenius-desktop][proxy] search:folders failed — is the sidecar running?', err);
      return { folders: [], total: 0, error: true };
    }
  });

  ipcMain.handle('search:explorer', async (_event, payload: Record<string, unknown> | undefined) => {
    try {
      const res = await fetch(`${SERVER_URL}/search/explorer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader() },
        body: JSON.stringify(payload ?? {}),
      });
      return await res.json();
    } catch (err) {
      console.error('[aigenius-desktop][proxy] search:explorer failed — is the sidecar running?', err);
      return {
        mode: 'root',
        currentDirectory: '',
        parentDirectory: null,
        breadcrumbPrefixes: [],
        folders: [],
        files: [],
        totalRootFolders: 0,
        totalFilesInDirectory: 0,
        subtreeScanTruncated: false,
        error: true,
      };
    }
  });

  ipcMain.handle(
    'search:row',
    async (_event, payload: { path?: string; maxContentChars?: number }) => {
      try {
        const res = await fetch(`${SERVER_URL}/search/row`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...authHeader() },
          body: JSON.stringify(payload ?? {}),
        });
        return await res.json();
      } catch (err) {
        console.error('[aigenius-desktop][proxy] search:row failed — is the sidecar running?', err);
        return { error: 'network' };
      }
    },
  );

  ipcMain.handle('search:aigeniusignore', async (_event, payload: { rootPath?: string; content?: string; action?: string }) => {
    try {
      if (payload?.action === 'write' && typeof payload.rootPath === 'string') {
        const res = await fetch(`${SERVER_URL}/search/aigeniusignore`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', ...authHeader() },
          body: JSON.stringify({ rootPath: payload.rootPath, content: payload.content ?? '' }),
        });
        return await res.json();
      }
      const rootPath = typeof payload?.rootPath === 'string' ? encodeURIComponent(payload.rootPath) : '';
      const res = await fetch(`${SERVER_URL}/search/aigeniusignore?rootPath=${rootPath}`, {
        headers: authHeader(),
      });
      return await res.json();
    } catch (err) {
      console.error('[aigenius-desktop][proxy] search:aigeniusignore failed', err);
      return { error: true };
    }
  });
}

