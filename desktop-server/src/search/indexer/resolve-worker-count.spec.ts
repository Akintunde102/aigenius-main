import os from 'os';
import { resolveSearchWorkerCount } from './resolve-worker-count.js';

describe('resolveSearchWorkerCount', () => {
  const originalWorkers = process.env.AIGENIUS_SEARCH_WORKERS;

  afterEach(() => {
    if (originalWorkers === undefined) {
      delete process.env.AIGENIUS_SEARCH_WORKERS;
    } else {
      process.env.AIGENIUS_SEARCH_WORKERS = originalWorkers;
    }
    jest.restoreAllMocks();
  });

  it('uses 40% of logical cores rounded, minimum 1', () => {
    jest.spyOn(os, 'cpus').mockReturnValue(Array.from({ length: 8 }, () => ({} as os.CpuInfo)));
    delete process.env.AIGENIUS_SEARCH_WORKERS;
    expect(resolveSearchWorkerCount()).toBe(3);
  });

  it('rounds 12 cores at 40% to 5', () => {
    jest.spyOn(os, 'cpus').mockReturnValue(Array.from({ length: 12 }, () => ({} as os.CpuInfo)));
    delete process.env.AIGENIUS_SEARCH_WORKERS;
    expect(resolveSearchWorkerCount()).toBe(5);
  });

  it('never goes below 1 worker', () => {
    jest.spyOn(os, 'cpus').mockReturnValue([{} as os.CpuInfo]);
    delete process.env.AIGENIUS_SEARCH_WORKERS;
    expect(resolveSearchWorkerCount()).toBe(1);
  });

  it('respects explicit override', () => {
    expect(resolveSearchWorkerCount('6')).toBe(6);
    expect(resolveSearchWorkerCount(2)).toBe(2);
  });
});
