import type { Writable } from 'stream';

let stdioEpipeHandlersAttached = false;

/** Prevent EPIPE on closed stdout/stderr (GUI Electron has no console). */
export function attachStdioEpipeHandlers(): void {
  if (stdioEpipeHandlersAttached) return;
  stdioEpipeHandlersAttached = true;

  for (const stream of [process.stdout, process.stderr]) {
    stream.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code !== 'EPIPE') {
        console.error('[aigenius-desktop] stdio stream error:', err);
      }
    });
  }
}

export function safeStdioWrite(stream: Writable, chunk: Buffer | string): void {
  if (!stream.writable || stream.destroyed) return;
  stream.write(chunk, (err) => {
    if (err && (err as NodeJS.ErrnoException).code !== 'EPIPE') {
      console.error('[aigenius-desktop] stdio write error:', err);
    }
  });
}
