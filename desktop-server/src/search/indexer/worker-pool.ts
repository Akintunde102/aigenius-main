import { Worker } from 'worker_threads';
import path from 'path';
import { fileURLToPath } from 'url';
import type { WorkerInput, WorkerOutput } from '../types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface PendingJob {
  input: WorkerInput;
  resolve: (output: WorkerOutput) => void;
}

type WorkerWithJob = Worker & {
  _resolve?: (output: WorkerOutput) => void;
  _pendingInput?: WorkerInput;
  _failureHandled?: boolean;
};

/**
 * Manages a fixed pool of extraction worker threads.
 * Routes jobs to idle workers; queues excess jobs until a worker is free.
 * All SQLite writes happen in the main thread; workers only extract content.
 */
export class WorkerPool {
  private workers: Worker[] = [];
  private idle: Worker[] = [];
  private queue: PendingJob[] = [];

  constructor(
    private readonly count: number,
    private readonly modelsDir: string,
    private readonly skipImages: boolean,
  ) {}

  /** Start all worker threads. Call once at startup. */
  start(): void {
    for (let i = 0; i < this.count; i++) {
      this.spawnWorker();
    }
  }

  /** Enqueue a file for extraction; resolves when the worker completes. */
  run(input: WorkerInput): Promise<WorkerOutput> {
    return new Promise((resolve) => {
      this.queue.push({ input, resolve });
      this.drain();
    });
  }

  /** Terminate all workers (call on app quit). */
  async terminate(): Promise<void> {
    for (const w of this.workers) {
      const ww = w as WorkerWithJob;
      ww._failureHandled = true;
      this.finishPendingJobWithError(w, new Error('Worker terminated'));
    }
    await Promise.all(this.workers.map((w) => w.terminate()));
    this.workers = [];
    this.idle = [];
  }

  private spawnWorker(): void {
    const workerScript = path.join(__dirname, 'worker.js');
    const w = new Worker(workerScript, {
      workerData: { modelsDir: this.modelsDir, skipImages: this.skipImages },
    });
    w.on('message', (output: WorkerOutput) => this.onResult(w, output));
    w.on('error', (err) => this.onWorkerBroken(w, err));
    w.on('exit', (code) => {
      if (code !== 0) {
        this.onWorkerBroken(w, new Error(`Worker exited with code ${code}`));
      }
    });
    this.workers.push(w);
    this.idle.push(w);
  }

  private onWorkerBroken(w: Worker, err: unknown): void {
    const ww = w as WorkerWithJob;
    if (ww._failureHandled) return;
    ww._failureHandled = true;
    console.error('[search-worker-pool] Worker failed:', err);
    this.finishPendingJobWithError(w, err);
    this.removeWorker(w);
    if (this.workers.length < this.count) {
      this.spawnWorker();
    }
    this.drain();
  }

  private finishPendingJobWithError(w: Worker, err: unknown): void {
    const ww = w as WorkerWithJob;
    const resolve = ww._resolve;
    const input = ww._pendingInput;
    delete ww._resolve;
    delete ww._pendingInput;
    if (!resolve) return;
    const message = err instanceof Error ? err.message : String(err);
    resolve({
      path: input?.path ?? '',
      mtime: input?.mtime ?? 0,
      content: '',
      tags: [],
      error: message,
    });
  }

  private removeWorker(w: Worker): void {
    this.workers = this.workers.filter((x) => x !== w);
    this.idle = this.idle.filter((x) => x !== w);
    try {
      void w.terminate();
    } catch {
      /* ignore */
    }
  }

  private drain(): void {
    while (this.queue.length > 0 && this.idle.length > 0) {
      const worker = this.idle.pop()!;
      const job = this.queue.shift()!;
      worker.postMessage(job.input);
      const ww = worker as WorkerWithJob;
      ww._resolve = job.resolve;
      ww._pendingInput = job.input;
    }
  }

  private onResult(worker: Worker, output: WorkerOutput): void {
    const ww = worker as WorkerWithJob;
    const resolve = ww._resolve;
    delete ww._resolve;
    delete ww._pendingInput;
    if (!resolve) return;
    this.idle.push(worker);
    resolve(output);
    this.drain();
  }
}
