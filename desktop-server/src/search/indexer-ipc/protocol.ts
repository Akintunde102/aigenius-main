export const DEFAULT_INDEXER_IPC_PORT = 18_012;

export type IndexerIpcRequestBody =
  | { op: 'ping' }
  | { op: 'switch-project'; projectId?: string; rootPath: string; dbPath?: string }
  | { op: 'index-project'; rootPath: string; force?: boolean }
  | { op: 'reindex'; paths?: string[]; force?: boolean }
  | { op: 'shutdown' };

export type IndexerIpcRequest = IndexerIpcRequestBody & { id: string };

export type IndexerIpcResponse =
  | { id: string; ok: true; result?: unknown }
  | { id: string; ok: false; error: string };

export function parseIndexerIpcLine(line: string): IndexerIpcRequest | null {
  const trimmed = line.trim();
  if (!trimmed) return null;
  try {
    const msg = JSON.parse(trimmed) as IndexerIpcRequest;
    if (!msg || typeof msg !== 'object' || typeof msg.id !== 'string' || typeof msg.op !== 'string') {
      return null;
    }
    return msg;
  } catch {
    return null;
  }
}
