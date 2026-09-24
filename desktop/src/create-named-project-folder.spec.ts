import fs from 'fs';
import os from 'os';
import path from 'path';
import {
  createNamedProjectFolder,
  isPathInsideParent,
  joinNamedProjectFolderPath,
  joinSilentProjectsParentDir,
  runCreateNamedProjectDirectoryRequest,
  runCreateNamedProjectDirectorySilent,
  sanitizeProjectFolderName,
} from './create-named-project-folder';

describe('sanitizeProjectFolderName', () => {
  it('keeps a typical generated project name', () => {
    expect(sanitizeProjectFolderName('grand-meadow-91')).toBe('grand-meadow-91');
  });

  it('trims whitespace and strips illegal characters on every platform', () => {
    expect(sanitizeProjectFolderName('  My App?  ')).toBe('My App');
    expect(sanitizeProjectFolderName('foo/bar\\baz')).toBe('foo-bar-baz');
    expect(sanitizeProjectFolderName('a<>:"|?*b')).toBe('a-b');
  });

  it('rejects empty, dot, and parent-directory names', () => {
    expect(sanitizeProjectFolderName('')).toBeNull();
    expect(sanitizeProjectFolderName('   ')).toBeNull();
    expect(sanitizeProjectFolderName('.')).toBeNull();
    expect(sanitizeProjectFolderName('..')).toBeNull();
    expect(sanitizeProjectFolderName('...')).toBeNull();
  });

  it('renames Windows reserved device names instead of failing', () => {
    expect(sanitizeProjectFolderName('CON')).toBe('CON-project');
    expect(sanitizeProjectFolderName('com1')).toBe('com1-project');
    expect(sanitizeProjectFolderName('nul.txt')).toBe('nul.txt-project');
  });

  it('strips control characters and trailing dots', () => {
    expect(sanitizeProjectFolderName('hello.\u0000world.')).toBe('hello-world');
  });
});

describe('joinNamedProjectFolderPath', () => {
  it('joins Windows parents with a backslash', () => {
    expect(joinNamedProjectFolderPath('C:\\Users\\me\\Documents', 'my-app', path.win32)).toBe(
      'C:\\Users\\me\\Documents\\my-app',
    );
  });

  it('joins POSIX parents with a slash', () => {
    expect(joinNamedProjectFolderPath('/home/me/Documents', 'my-app', path.posix)).toBe(
      '/home/me/Documents/my-app',
    );
  });

  it('does not duplicate separators when the parent already has a trailing slash', () => {
    expect(joinNamedProjectFolderPath('/tmp/projects/', 'alpha', path.posix)).toBe('/tmp/projects/alpha');
    expect(joinNamedProjectFolderPath('D:\\code\\', 'alpha', path.win32)).toBe('D:\\code\\alpha');
  });
});

describe('isPathInsideParent', () => {
  it('treats a Windows child as inside its parent regardless of slash style or casing', () => {
    expect(
      isPathInsideParent('C:\\Users\\me\\Documents', 'c:/users/me/documents/my-app', { sep: '\\' }),
    ).toBe(true);
  });

  it('rejects a Windows path that escaped the parent', () => {
    expect(
      isPathInsideParent('C:\\Users\\me\\Documents', 'C:\\Users\\me\\Windows', { sep: '\\' }),
    ).toBe(false);
  });

  it('accepts a POSIX child under its parent and rejects a sibling', () => {
    expect(isPathInsideParent('/home/me/docs', '/home/me/docs/app', { sep: '/' })).toBe(true);
    expect(isPathInsideParent('/home/me/docs', '/home/me/other', { sep: '/' })).toBe(false);
  });
});

describe('createNamedProjectFolder', () => {
  it('creates the named folder in a temp parent on this platform', async () => {
    const parent = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'aigenius-named-folder-'));
    try {
      const result = await createNamedProjectFolder({
        parentDir: parent,
        folderName: 'grand-meadow-91',
      });
      expect(result).toEqual({
        ok: true,
        path: path.join(parent, 'grand-meadow-91'),
        created: true,
      });
      const stat = await fs.promises.stat(path.join(parent, 'grand-meadow-91'));
      expect(stat.isDirectory()).toBe(true);
    } finally {
      await fs.promises.rm(parent, { recursive: true, force: true });
    }
  });

  it('reuses an existing directory instead of failing', async () => {
    const parent = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'aigenius-named-folder-reuse-'));
    const existing = path.join(parent, 'already-there');
    try {
      await fs.promises.mkdir(existing);
      const result = await createNamedProjectFolder({
        parentDir: parent,
        folderName: 'already-there',
      });
      expect(result).toEqual({ ok: true, path: existing, created: false });
    } finally {
      await fs.promises.rm(parent, { recursive: true, force: true });
    }
  });

  it('rejects when a file already occupies the target path', async () => {
    const parent = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'aigenius-named-folder-file-'));
    try {
      await fs.promises.writeFile(path.join(parent, 'taken'), 'nope');
      const result = await createNamedProjectFolder({
        parentDir: parent,
        folderName: 'taken',
      });
      expect(result).toEqual({ ok: false, error: 'A file already exists at that path' });
    } finally {
      await fs.promises.rm(parent, { recursive: true, force: true });
    }
  });

  it('rejects relative parents and traversal that would escape the chosen folder', async () => {
    const relative = await createNamedProjectFolder({
      parentDir: 'Documents',
      folderName: 'app',
    });
    expect(relative.ok).toBe(false);

    const mkdir = jest.fn();
    const escaped = await createNamedProjectFolder({
      parentDir: '/home/me/Documents',
      folderName: 'safe',
      pathImpl: {
        join: () => '/etc/escaped',
        resolve: (...parts: string[]) => path.posix.resolve(...parts),
        isAbsolute: (value) => path.posix.isAbsolute(value),
        sep: '/',
      },
      fsImpl: {
        mkdir,
        stat: jest.fn(),
      },
    });
    expect(escaped).toEqual({
      ok: false,
      error: 'Could not create that folder name in the chosen location',
    });
    expect(mkdir).not.toHaveBeenCalled();
  });

  it('maps permission errors to a readable message', async () => {
    const err = Object.assign(new Error('denied'), { code: 'EACCES' });
    const result = await createNamedProjectFolder({
      parentDir: path.resolve(os.tmpdir()),
      folderName: 'blocked',
      fsImpl: {
        mkdir: async () => {
          throw err;
        },
        stat: async () => {
          throw Object.assign(new Error('missing'), { code: 'ENOENT' });
        },
      },
    });
    expect(result).toEqual({ ok: false, error: 'Permission denied creating that folder' });
  });
});

describe('runCreateNamedProjectDirectoryRequest', () => {
  it('does not open a picker when the name is invalid', async () => {
    const showOpenDialog = jest.fn();
    const result = await runCreateNamedProjectDirectoryRequest({
      folderName: '   ',
      documentsPath: '/tmp',
      showOpenDialog,
    });
    expect(result).toEqual({ ok: false, error: 'Enter a valid project name first' });
    expect(showOpenDialog).not.toHaveBeenCalled();
  });

  it('returns canceled when the user dismisses the parent picker', async () => {
    const createFolder = jest.fn();
    const result = await runCreateNamedProjectDirectoryRequest({
      folderName: 'swift-atlas-42',
      documentsPath: '/Users/me/Documents',
      showOpenDialog: async (options) => {
        expect(options.title).toContain('swift-atlas-42');
        expect(options.buttonLabel).toBe('Create folder here');
        expect(options.properties).toEqual(['openDirectory', 'createDirectory']);
        expect(options.defaultPath).toBe('/Users/me/Documents');
        return { canceled: true, filePaths: [] };
      },
      createFolder,
    });
    expect(result).toEqual({ ok: true, canceled: true });
    expect(createFolder).not.toHaveBeenCalled();
  });

  it('creates the named folder inside the picked parent', async () => {
    const createFolder = jest.fn().mockResolvedValue({
      ok: true,
      path: '/home/me/code/swift-atlas-42',
      created: true,
    });
    const result = await runCreateNamedProjectDirectoryRequest({
      folderName: 'swift-atlas-42',
      documentsPath: '/home/me/Documents',
      showOpenDialog: async () => ({ canceled: false, filePaths: ['/home/me/code'] }),
      createFolder,
    });
    expect(createFolder).toHaveBeenCalledWith({
      parentDir: '/home/me/code',
      folderName: 'swift-atlas-42',
    });
    expect(result).toEqual({
      ok: true,
      path: '/home/me/code/swift-atlas-42',
      created: true,
    });
  });
});

describe('runCreateNamedProjectDirectorySilent', () => {
  it('does not open a picker and creates under Documents/AIGenius Projects', async () => {
    const createFolder = jest.fn().mockResolvedValue({
      ok: true,
      path: '/home/me/Documents/AIGenius Projects/Demo',
      created: true,
    });
    const result = await runCreateNamedProjectDirectorySilent({
      folderName: 'Demo',
      documentsPath: '/home/me/Documents',
      pathImpl: path.posix,
      createFolder,
    });
    expect(createFolder).toHaveBeenCalledWith({
      parentDir: '/home/me/Documents/AIGenius Projects',
      folderName: 'Demo',
      pathImpl: path.posix,
    });
    expect(result).toEqual({
      ok: true,
      path: '/home/me/Documents/AIGenius Projects/Demo',
      created: true,
    });
  });

  it('reuses an existing directory instead of failing', async () => {
    const createFolder = jest.fn().mockResolvedValue({
      ok: true,
      path: '/home/me/Documents/AIGenius Projects/Demo',
      created: false,
    });
    const result = await runCreateNamedProjectDirectorySilent({
      folderName: 'Demo',
      documentsPath: '/home/me/Documents',
      pathImpl: path.posix,
      createFolder,
    });
    expect(result).toEqual({
      ok: true,
      path: '/home/me/Documents/AIGenius Projects/Demo',
      created: false,
    });
  });

  it('rejects an invalid name without calling mkdir', async () => {
    const createFolder = jest.fn();
    const result = await runCreateNamedProjectDirectorySilent({
      folderName: '   ',
      documentsPath: '/home/me/Documents',
      createFolder,
    });
    expect(result).toEqual({ ok: false, error: 'Enter a valid project name first' });
    expect(createFolder).not.toHaveBeenCalled();
  });

  it('joins the silent parent folder name', () => {
    expect(joinSilentProjectsParentDir('/home/me/Documents', path.posix)).toBe(
      '/home/me/Documents/AIGenius Projects',
    );
  });
});
