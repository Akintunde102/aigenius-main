import {
  hiddenSpawnOptions,
  hiddenSpawnSyncOptions,
  WIN32_CREATE_NO_WINDOW,
} from '../hidden-child-process';
import type { SpawnOptions, SpawnSyncOptions } from 'child_process';

describe('hidden-child-process', () => {
  const platform = process.platform;

  afterEach(() => {
    Object.defineProperty(process, 'platform', { value: platform });
  });

  it('passes through options unchanged on non-Windows platforms', () => {
    Object.defineProperty(process, 'platform', { value: 'darwin' });
    expect(hiddenSpawnOptions({ cwd: '/tmp' })).toEqual({
      cwd: '/tmp',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
  });

  it('sets windowsHide, piped stdio, and CREATE_NO_WINDOW on win32', () => {
    Object.defineProperty(process, 'platform', { value: 'win32' });
    const options = hiddenSpawnOptions({ cwd: 'C:\\work' }) as SpawnOptions & {
      creationFlags?: number;
    };
    expect(options.windowsHide).toBe(true);
    expect(options.stdio).toEqual(['pipe', 'pipe', 'pipe']);
    expect(options.creationFlags).toBe(WIN32_CREATE_NO_WINDOW);
  });

  it('merges CREATE_NO_WINDOW with existing creationFlags on win32', () => {
    Object.defineProperty(process, 'platform', { value: 'win32' });
    const options = hiddenSpawnSyncOptions({ creationFlags: 0x10 } as SpawnSyncOptions & {
      creationFlags: number;
    }) as SpawnSyncOptions & { creationFlags?: number };
    expect(options.creationFlags).toBe(0x10 | WIN32_CREATE_NO_WINDOW);
    expect(options.windowsHide).toBe(true);
  });

  it('preserves custom stdio when provided', () => {
    Object.defineProperty(process, 'platform', { value: 'win32' });
    const options = hiddenSpawnOptions({ stdio: 'ignore' });
    expect(options.stdio).toBe('ignore');
  });
});
