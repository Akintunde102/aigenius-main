import path from 'path';
import os from 'os';
import {
  canRecreateProjectRootAtPath,
  checkCodeProjectRootPath,
  normalizeProjectRootInput,
} from './check-code-project-root-path';

describe('normalizeProjectRootInput', () => {
  it('rejects empty and relative paths', () => {
    expect(normalizeProjectRootInput('')).toBeNull();
    expect(normalizeProjectRootInput('relative/dir')).toBeNull();
  });

  it('resolves absolute paths', () => {
    const abs = path.join(os.tmpdir(), 'proj');
    expect(normalizeProjectRootInput(abs)).toBe(path.resolve(abs));
  });
});

describe('checkCodeProjectRootPath', () => {
  it('returns ok for an existing directory', async () => {
    const root = path.join(os.tmpdir(), `aigenius-root-ok-${Date.now()}`);
    const fsImpl = {
      stat: jest.fn(async () => ({ isDirectory: () => true })),
      access: jest.fn(async () => undefined),
    };
    const result = await checkCodeProjectRootPath(root, fsImpl);
    expect(result.ok).toBe(true);
    expect(result.status).toBe('ok');
    expect(result.canRecreate).toBe(false);
  });

  it('returns missing with canRecreate when parent exists', async () => {
    const root = path.join(os.tmpdir(), 'missing-child');
    const parent = path.dirname(root);
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
    };
    const result = await checkCodeProjectRootPath(root, fsImpl);
    expect(result.ok).toBe(false);
    expect(result.status).toBe('missing');
    expect(result.canRecreate).toBe(true);
  });

  it('returns not_directory when path is a file', async () => {
    const root = path.join(os.tmpdir(), 'file-path');
    const fsImpl = {
      stat: jest.fn(async () => ({ isDirectory: () => false })),
      access: jest.fn(async () => undefined),
    };
    const result = await checkCodeProjectRootPath(root, fsImpl);
    expect(result.status).toBe('not_directory');
    expect(result.canRecreate).toBe(false);
  });

  it('returns permission_denied on EACCES', async () => {
    const root = path.join(os.tmpdir(), 'denied');
    const fsImpl = {
      stat: jest.fn(async () => {
        const err = new Error('denied') as NodeJS.ErrnoException;
        err.code = 'EACCES';
        throw err;
      }),
      access: jest.fn(async () => undefined),
    };
    const result = await checkCodeProjectRootPath(root, fsImpl);
    expect(result.status).toBe('permission_denied');
  });
});

describe('canRecreateProjectRootAtPath', () => {
  it('is false when target already exists', async () => {
    const target = path.join(os.tmpdir(), 'exists');
    const fsImpl = {
      stat: jest.fn(async () => ({ isDirectory: () => true })),
      access: jest.fn(async () => undefined),
    };
    await expect(canRecreateProjectRootAtPath(target, fsImpl)).resolves.toBe(false);
  });
});
