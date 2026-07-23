import net from 'net';
import type { IndexerIpcRequest, IndexerIpcRequestBody, IndexerIpcResponse } from './protocol.js';
import { parseIndexerIpcLine } from './protocol.js';
import { DEFAULT_INDEXER_IPC_PORT } from './protocol.js';

export type IndexerIpcHandlers = {
  ping: () => Promise<unknown>;
  'switch-project': (req: Extract<IndexerIpcRequestBody, { op: 'switch-project' }>) => Promise<unknown>;
  'index-project': (req: Extract<IndexerIpcRequestBody, { op: 'index-project' }>) => Promise<unknown>;
  reindex: (req: Extract<IndexerIpcRequestBody, { op: 'reindex' }>) => Promise<unknown>;
  shutdown: () => Promise<unknown>;
};

export function startIndexerIpcServer(handlers: IndexerIpcHandlers): Promise<net.Server> {
  const port = (() => {
    const raw = process.env.AIGENIUS_INDEXER_IPC_PORT;
    const n = raw ? Number.parseInt(raw, 10) : DEFAULT_INDEXER_IPC_PORT;
    return Number.isFinite(n) && n > 0 ? n : DEFAULT_INDEXER_IPC_PORT;
  })();
  const host = process.env.AIGENIUS_INDEXER_IPC_HOST ?? '127.0.0.1';

  const server = net.createServer((socket) => {
    socket.on('error', (err) => {
      console.warn('[indexer-ipc] socket error:', err.message);
    });
    let buffer = '';
    socket.on('data', (chunk) => {
      buffer += chunk.toString('utf8');
      const lineEnd = buffer.indexOf('\n');
      if (lineEnd < 0) return;
      const line = buffer.slice(0, lineEnd);
      void handleLine(line, handlers)
        .then((response) => {
          socket.write(`${JSON.stringify(response)}\n`);
          socket.end();
        })
        .catch((err: unknown) => {
          const response: IndexerIpcResponse = {
            id: 'unknown',
            ok: false,
            error: err instanceof Error ? err.message : String(err),
          };
          socket.write(`${JSON.stringify(response)}\n`);
          socket.end();
        });
    });
  });

  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, host, () => {
      console.info(`[indexer-ipc] listening on ${host}:${port}`);
      resolve(server);
    });
  });
}

async function handleLine(line: string, handlers: IndexerIpcHandlers): Promise<IndexerIpcResponse> {
  const req = parseIndexerIpcLine(line);
  if (!req) {
    return { id: 'unknown', ok: false, error: 'Invalid IPC request' };
  }

  try {
    switch (req.op) {
      case 'ping':
        return { id: req.id, ok: true, result: await handlers.ping() };
      case 'switch-project':
        return { id: req.id, ok: true, result: await handlers['switch-project'](req) };
      case 'index-project':
        return { id: req.id, ok: true, result: await handlers['index-project'](req) };
      case 'reindex':
        return { id: req.id, ok: true, result: await handlers.reindex(req) };
      case 'shutdown':
        return { id: req.id, ok: true, result: await handlers.shutdown() };
      default: {
        const unknownOp = (req as { op?: string }).op ?? 'unknown';
        return { id: (req as IndexerIpcRequest).id, ok: false, error: `Unknown op: ${unknownOp}` };
      }
    }
  } catch (err: unknown) {
    return {
      id: req.id,
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
