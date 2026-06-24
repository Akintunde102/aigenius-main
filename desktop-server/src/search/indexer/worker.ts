import { workerData, parentPort } from 'worker_threads';
import type { WorkerInput, WorkerOutput } from '../types.js';
import { routeExtraction } from './extractors/router.js';

const { modelsDir, skipImages } = workerData as {
  modelsDir: string;
  skipImages: boolean;
};

if (!parentPort) {
  throw new Error('[search-worker] Must run inside a Worker thread');
}

parentPort.on('message', async (input: WorkerInput) => {
  const { path: filePath, mtime } = input;

  const { content, tags, error } = await routeExtraction(
    filePath,
    modelsDir,
    skipImages,
  );

  const output: WorkerOutput = {
    path: filePath,
    mtime,
    content,
    tags,
    error,
  };

  parentPort!.postMessage(output);
});
