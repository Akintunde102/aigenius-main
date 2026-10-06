import path from 'path';
import os from 'os';
import { recreateCodeProjectRootAtPath } from './recreate-code-project-root-at-path';

describe('recreateCodeProjectRootAtPath', () => {
  it('creates directory when missing and parent exists', async () => {
    const root = path.join(os.tmpdir(), `aigenius-recreate-${Date.now()}`, 'proj');
    const parent = path.dirname(root);
    const mkdir = jest.fn(async () => undefined);
    const fsImpl = {
      stat: jest.fn(async (target: string) => {
        if (target === parent) {
          return { isDirectory: () => true };
        }
        const err = new Error('missing') as NodeJS.ErrnoException;
        err.code = 'ENOENT';
        throw err;
      }),
      access: jest.fn(async () => undefined),
      mkdir,
    };
    const result = await recreateCodeProjectRootAtPath(root, fsImpl);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.created).toBe(true);
      expect(mkdir).toHaveBeenCalledWith(path.resolve(root), { recursive: false });
    }
  });

  it('returns error when parent is missing', async () => {
    const root = path.join(os.tmpdir(), 'no-parent', 'child');
    const fsImpl = {
      stat: jest.fn(async () => {
        const err = new Error('missing') as NodeJS.ErrnoException;
        err.code = 'ENOENT';
        throw err;
      }),
      access: jest.fn(async () => undefined),
      mkdir: jest.fn(),
    };
    const result = await recreateCodeProjectRootAtPath(root, fsImpl);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/parent/i);
    }
  });

  it('reuses existing directory without mkdir', async () => {
    const root = path.join(os.tmpdir(), 'already-there');
    const mkdir = jest.fn();
    const fsImpl = {
      stat: jest.fn(async () => ({ isDirectory: () => true })),
      access: jest.fn(async () => undefined),
      mkdir,
    };
    const result = await recreateCodeProjectRootAtPath(root, fsImpl);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.created).toBe(false);
    }
    expect(mkdir).not.toHaveBeenCalled();
  });
});
