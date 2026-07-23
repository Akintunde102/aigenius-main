import net from 'net';
import { randomUUID } from 'crypto';
import { DEFAULT_INDEXER_IPC_PORT } from './protocol.js';
import type { IndexerIpcRequest, IndexerIpcRequestBody, IndexerIpcResponse } from './protocol.js';

function resolvePort(): number {
  const raw = process.env.AIGENIUS_INDEXER_IPC_PORT;
  const n = raw ? Number.parseInt(raw, 10) : DEFAULT_INDEXER_IPC_PORT;
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_INDEXER_IPC_PORT;
}

export async function callIndexerIpc<T = unknown>(
  request: IndexerIpcRequestBody,
  timeoutMs = 30_000,
): Promise<T> {
  const port = resolvePort();
  const host = process.env.AIGENIUS_INDEXER_IPC_HOST ?? '127.0.0.1';
  const id = randomUUID();
  const payload: IndexerIpcRequest = { ...request, id } as IndexerIpcRequest;

  return new Promise<T>((resolve, reject) => {
    const socket = net.createConnection({ host, port }, () => {
      socket.write(`${JSON.stringify(payload)}\n`);
    });

    let buffer = '';
    const timer = setTimeout(() => {
      socket.destroy();
      reject(new Error(`Indexer IPC timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    socket.on('data', (chunk) => {
      buffer += chunk.toString('utf8');
      const lineEnd = buffer.indexOf('\n');
      if (lineEnd < 0) return;
      const line = buffer.slice(0, lineEnd);
      socket.end();
      clearTimeout(timer);
      try {
        const res = JSON.parse(line) as IndexerIpcResponse;
        if (!res.ok) {
          reject(new Error(res.error || 'Indexer IPC failed'));
          return;
        }
        resolve(res.result as T);
      } catch (err) {
        reject(err instanceof Error ? err : new Error(String(err)));
      }
    });

    socket.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

export async function waitForIndexerIpcReady(timeoutMs = 60_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      await callIndexerIpc({ op: 'ping' }, 2_000);
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 250));
    }
  }
  throw new Error(`Indexer IPC not ready after ${timeoutMs}ms`);
}

export function isExternalIndexerEnabled(): boolean {
  return process.env.AIGENIUS_EXTERNAL_INDEXER === '1';
}
