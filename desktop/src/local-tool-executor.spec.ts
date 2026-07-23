import { runLocalDesktopTool, resolveShellProcessClose } from './local-tool-executor';
import fs from 'fs/promises';
import { ReadableStream } from 'stream/web';
import { listDirectoryViaShell } from './utils/list-directory-via-shell';
import {
  clearPreviewPathRegistryForTests,
  isPreviewPathRegistered,
} from './preview-path-registry';

jest.mock('./utils/read-file/path-resolver', () => ({
  resolveReadFilePath: jest.fn(async (inputPath: string) => {
    if (!inputPath?.trim()) {
      return { ok: false, error: 'Error: file not found — path is required' };
    }
    const resolved = inputPath.startsWith('/') ? inputPath : `/home/user/${inputPath}`;
    return { ok: true, resolved, displayPath: inputPath };
  }),
}));

jest.mock('./active-code-project', () => ({
  getActiveCodeProjectRootPath: () => '/home/user',
  getActiveCodeProjectId: () => 'test-project',
  setActiveCodeProjectIndex: jest.fn(),
}));

// Mock fs/promises
jest.mock('fs/promises', () => ({
  open: jest.fn(),
  readdir: jest.fn(),
  stat: jest.fn().mockResolvedValue({ isFile: () => true, isDirectory: () => false }),
  realpath: jest.fn((p: string) => Promise.resolve(p)),
}));

// Mock Electron
jest.mock('electron', () => ({
  dialog: {
    showMessageBox: jest.fn(),
  },
  shell: {
    openPath: jest.fn().mockResolvedValue(''),
  },
}));

// Mock the resolve helper
jest.mock('./resolve-browser-window-for-ipc', () => ({
  resolveBrowserWindowForIpcSender: jest.fn(),
}));

jest.mock('./utils/list-directory-via-shell', () => ({
  listDirectoryViaShell: jest.fn(),
}));

jest.mock('./utils/read-file-lines', () => {
  const actual = jest.requireActual('./utils/read-file-lines');
  return {
    ...actual,
    countFileLines: jest.fn().mockResolvedValue({ totalLines: 1, lineCountOmitted: false }),
    readFileLines: jest.fn().mockResolvedValue({
      lines: ['Hello World from a local file!'],
      totalLines: 1,
      lineStart: 1,
      lineEnd: 1,
      truncatedBelow: false,
      lineCountOmitted: false,
    }),
  };
});

jest.mock('./utils/read-file/binary-detect', () => ({
  isBinaryFile: jest.fn().mockResolvedValue(false),
}));

import * as readFileLinesMod from './utils/read-file-lines';

describe('resolveShellProcessClose', () => {
  it('uses numeric exit code when the child reports one', () => {
    expect(resolveShellProcessClose(0, null)).toEqual({ exitCode: 0, stderrSuffix: '' });
    expect(resolveShellProcessClose(42, 'SIGTERM')).toEqual({ exitCode: 42, stderrSuffix: '' });
  });

  it('maps signal-only termination to non-zero exit and stderr note', () => {
    const r = resolveShellProcessClose(null, 'SIGKILL');
    expect(r.exitCode).toBe(1);
    expect(r.stderrSuffix).toContain('SIGKILL');
  });

  it('maps unknown close (no code, no signal) to non-zero exit', () => {
    const r = resolveShellProcessClose(null, null);
    expect(r.exitCode).toBe(1);
    expect(r.stderrSuffix).toContain('unknown');
  });
});

describe('local_rag_query formatting (TDD RED Phase)', () => {
  const mockSender = {
    isDestroyed: () => false,
    send: jest.fn(),
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
    clearPreviewPathRegistryForTests();
    process.env.AIGENIUS_SECRET_TOKEN = 'test-token';
    global.fetch = jest.fn();
  });

  it('formats local_rag_query results as readable Markdown instead of raw JSON', async () => {
    const mockData = {
      hits: [
        {
          path: '/home/user/doc1.txt',
          name: 'doc1.txt',
          score: 0.95,
          snippet: 'This is a snippet about resumes...',
        },
        {
          path: '/home/user/doc2.pdf',
          name: 'doc2.pdf',
          score: 0.82,
          snippet: 'Another hit content...',
        },
      ],
      hit_count: 2,
      scanned_chunks: 100,
      index_updated_at_ms: 1625097600000,
    };

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockData,
    });

    const out = await runLocalDesktopTool(mockSender, 'local_rag_query', { query: 'resume' });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/search/rag'),
      expect.objectContaining({
        body: expect.stringContaining('"contentQuery":"resume"'),
      }),
    );

    expect(out.ok).toBe(true);
    if (out.ok) {
      // RED PHASE: This will fail because the current implementation returns JSON.stringify(mockData)
      expect(out.result).toContain('### Local search');
      expect(out.result).toContain('doc1.txt');
      expect(out.result).not.toContain('{"hits":');
    }
  });

  it('registers absolute RAG hit paths for local-file preview', async () => {
    const mockData = {
      hits: [
        {
          path: '/home/user/doc1.txt',
          name: 'doc1.txt',
          score: 0.95,
          snippet: 'snippet one',
        },
        {
          path: '/home/user/nested/doc2.pdf',
          name: 'doc2.pdf',
          score: 0.82,
          snippet: 'snippet two',
        },
        {
          path: 'relative/path.txt',
          name: 'path.txt',
          score: 0.5,
          snippet: 'should not register',
        },
      ],
      hit_count: 3,
    };

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockData,
    });

    const out = await runLocalDesktopTool(mockSender, 'local_rag_query', { query: 'resume' });

    expect(out.ok).toBe(true);
    expect(isPreviewPathRegistered('/home/user/doc1.txt')).toBe(true);
    expect(isPreviewPathRegistered('/home/user')).toBe(true);
    expect(isPreviewPathRegistered('/home/user/nested/doc2.pdf')).toBe(true);
    expect(isPreviewPathRegistered('/home/user/nested')).toBe(true);
    expect(isPreviewPathRegistered('relative/path.txt')).toBe(false);
  });

  it('formats local_read_file as readable Markdown instead of raw JSON', async () => {
    (readFileLinesMod.readFileLines as jest.Mock).mockResolvedValue({
      lines: ['Hello World from a local file!'],
      totalLines: 1,
      lineStart: 1,
      lineEnd: 1,
      truncatedBelow: false,
      lineCountOmitted: false,
    });

    const out = await runLocalDesktopTool(mockSender, 'local_read_file', { path: '/home/user/test.txt' });

    expect(out.ok).toBe(true);
    if (out.ok) {
      expect(out.result).toContain('### Read file');
      expect(out.result).toContain('[test.txt](local-file://');
      expect(out.result).toContain(encodeURIComponent('/home/user/test.txt'));
      expect(out.result).toContain('- **Total lines**: 1');
      expect(out.result).toContain('Hello World from a local file!');
      expect(out.result).not.toContain('{"path":');
      expect(isPreviewPathRegistered('/home/user/test.txt')).toBe(true);
      expect(isPreviewPathRegistered('/home/user')).toBe(true);
    }
  });

  it('accepts read_file as an alias of local_read_file', async () => {
    (readFileLinesMod.readFileLines as jest.Mock).mockResolvedValue({
      lines: ['alias works'],
      totalLines: 1,
      lineStart: 1,
      lineEnd: 1,
      truncatedBelow: false,
      lineCountOmitted: false,
    });

    const out = await runLocalDesktopTool(mockSender, 'read_file', { path: '/home/user/alias.txt' });

    expect(out.ok).toBe(true);
    if (out.ok) {
      expect(out.result).toContain('alias works');
    }
  });

  it('formats local_read_file byte mode when max_bytes is set', async () => {
    const mockContent = 'Hello World from a local file!';
    const mockFd = {
      read: jest.fn(async (buf: Buffer) => {
        buf.write(mockContent, 0, 'utf8');
        return { bytesRead: mockContent.length };
      }),
      close: jest.fn().mockResolvedValue(undefined),
    };
    (fs.open as jest.Mock).mockResolvedValue(mockFd);
    (readFileLinesMod.countFileLines as jest.Mock).mockResolvedValue({ totalLines: 1, lineCountOmitted: false });

    const out = await runLocalDesktopTool(mockSender, 'local_read_file', {
      path: '/home/user/test.txt',
      offset: 0,
      max_bytes: 1024,
    });

    expect(out.ok).toBe(true);
    if (out.ok) {
      expect(out.result).toContain('- **Bytes read**: 30');
      expect(out.result).toContain('Hello World from a local file!');
    }
  });

  it('formats local_read_file line window with total line count', async () => {
    (readFileLinesMod.readFileLines as jest.Mock).mockResolvedValue({
      lines: ['line2', 'line3'],
      totalLines: 10,
      lineStart: 2,
      lineEnd: 3,
      truncatedBelow: true,
      lineCountOmitted: false,
    });

    const out = await runLocalDesktopTool(mockSender, 'local_read_file', {
      path: '/home/user/test.txt',
      start_line: 2,
      max_lines: 2,
    });

    expect(out.ok).toBe(true);
    if (out.ok) {
      expect(out.result).toContain('- **Total lines**: 10');
      expect(out.result).toContain('- **Lines shown**: 2–3');
      expect(out.result).toMatch(/Truncated|start_line=4/);
      expect(out.rawData?.mode).toBe('lines');
    }
  });

  it('maintains compatibility by showing extra fields in a Metadata section', async () => {
    const mockDataWithExtras = {
      hits: [
        {
          path: '/path/doc.txt',
          name: 'doc.txt',
          score: 1.0,
          snippet: 'snippet',
          new_api_field: 'surprised you!',
        },
      ],
      hit_count: 1,
    };

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockDataWithExtras,
    });

    const out = await runLocalDesktopTool(mockSender, 'local_rag_query', { query: 'x' });

    expect(out.ok).toBe(true);
    if (out.ok) {
      expect(out.result).toContain('Metadata');
      expect(out.result).toContain('new_api_field: surprised you!');
    }
  });

  it('rejects relative paths for local_open_in_os and does not register preview', async () => {
    const { shell } = jest.requireMock('electron') as { shell: { openPath: jest.Mock } };

    const out = await runLocalDesktopTool(mockSender, 'local_open_in_os', { path: 'relative/file.txt' });

    expect(out).toEqual({ ok: false, error: 'path must be an absolute path' });
    expect(shell.openPath).not.toHaveBeenCalled();
    expect(isPreviewPathRegistered('relative/file.txt')).toBe(false);
  });

  it('opens absolute paths in the OS and registers them for preview', async () => {
    const { shell } = jest.requireMock('electron') as { shell: { openPath: jest.Mock } };
    shell.openPath.mockResolvedValue('');

    const out = await runLocalDesktopTool(mockSender, 'local_open_in_os', { path: '/home/user/doc.txt' });

    expect(out).toEqual({ ok: true, result: 'File opened in OS' });
    expect(shell.openPath).toHaveBeenCalledWith('/home/user/doc.txt');
    expect(isPreviewPathRegistered('/home/user/doc.txt')).toBe(true);
  });

  it('successfully lists a directory using local_list_directory', async () => {
    (listDirectoryViaShell as jest.Mock).mockResolvedValue({
      shellCommand: "ls -la 'C:\\Users\\Test'",
      structured: true,
      items: [
        { name: 'file1.txt', path: 'C:\\Users\\Test\\file1.txt', isDir: false, size: 100, mtime: 123456789 },
        { name: 'subdir', path: 'C:\\Users\\Test\\subdir', isDir: true },
      ],
    });

    const out = await runLocalDesktopTool(mockSender, 'local_list_directory', { path: 'C:\\Users\\Test' });

    expect(out.ok).toBe(true);
    if (out.ok) {
      expect(out.result).toContain('### Directory listing');
      expect(out.result).toContain('file1.txt');
      expect(out.result).toContain('subdir');
      expect(out.result).toContain('Shell');
    }
  });

  it('rejects custom command output that looks like a mis-parsed PowerShell table', async () => {
    (listDirectoryViaShell as jest.Mock).mockResolvedValue({
      shellCommand: 'Get-ChildItem -Force | Select-Object Name',
      structured: false,
      parseRejected: true,
      items: [],
      terminalOutput: 'Name\n----\napps',
    });

    const out = await runLocalDesktopTool(mockSender, 'local_list_directory', {
      path: 'C:\\Users\\Test',
      command: 'Get-ChildItem -Force | Select-Object Name',
    });

    expect(out.ok).toBe(false);
    if (!out.ok) {
      expect(out.error).toMatch(/table headers/i);
      expect(out.error).toMatch(/omit `command`/i);
    }
  });
});

describe('local_ollama_chat desktop integration', () => {
  const encode = (text: string) => new TextEncoder().encode(text);
  const mockSender = {
    isDestroyed: () => false,
    send: jest.fn(),
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  it('posts the chat payload to local Ollama and returns the aggregated assistant text', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      body: new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(encode('{"message":{"content":"Hello"}}\n'));
          controller.enqueue(encode('{"message":{"content":" desktop"}}\n'));
          controller.close();
        },
      }),
    });

    const out = await runLocalDesktopTool(
      mockSender,
      'local_ollama_chat',
      {
        payload: {
          model: 'llama3',
          messages: [{ role: 'user', content: 'hello' }],
          stream: true,
        },
      },
    );

    expect(global.fetch).toHaveBeenCalledWith('http://localhost:11434/api/chat', expect.objectContaining({
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama3',
        messages: [{ role: 'user', content: 'hello' }],
        stream: true,
      }),
    }));
    expect(out).toEqual({ ok: true, result: 'Hello desktop' });
  });

  it('forwards raw Ollama stream lines to the renderer channel for frontend parsing', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      body: new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(encode('{"message":{"content":"A"}}\n{"message":{"content":"B"}}'));
          controller.close();
        },
      }),
    });

    const out = await runLocalDesktopTool(
      mockSender,
      'local_ollama_chat',
      {
        payload: {
          model: 'llama3',
          messages: [{ role: 'user', content: 'hello' }],
          stream: true,
        },
      },
      'stream-123',
    );

    expect(out).toEqual({ ok: true, result: 'AB' });
    expect(mockSender.send).toHaveBeenCalledWith(
      'local-desktop-tool-chunk:stream-123',
      { stream: 'stdout', text: '{"message":{"content":"A"}}\n' },
    );
    expect(mockSender.send).toHaveBeenCalledWith(
      'local-desktop-tool-chunk:stream-123',
      { stream: 'stdout', text: '{"message":{"content":"B"}}\n' },
    );
  });

  it('prepares Ollama cloud models before chatting', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: true, text: async () => '' })
      .mockResolvedValueOnce({
        ok: true,
        body: new ReadableStream<Uint8Array>({
          start(controller) {
            controller.enqueue(encode('{"message":{"content":"Cloud ready"}}\n'));
            controller.close();
          },
        }),
      });

    const out = await runLocalDesktopTool(
      mockSender,
      'local_ollama_chat',
      {
        payload: {
          model: 'gpt-oss:cloud',
          messages: [{ role: 'user', content: 'hello' }],
          stream: true,
        },
      },
    );

    expect(global.fetch).toHaveBeenNthCalledWith(1, 'http://localhost:11434/api/pull', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'gpt-oss:cloud', stream: false }),
    });
    expect(out).toEqual({ ok: true, result: 'Cloud ready' });
  });

  it('returns a useful error when Ollama responds without a stream body', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      body: null,
    });

    const out = await runLocalDesktopTool(
      mockSender,
      'local_ollama_chat',
      { payload: { model: 'llama3', messages: [], stream: true } },
    );

    expect(out).toEqual({ ok: false, error: 'No response body from Ollama' });
  });

  it('includes Ollama error response bodies for failed cloud chat requests', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: true, text: async () => '' })
      .mockResolvedValueOnce({
        ok: false,
        statusText: 'Forbidden',
        text: async () => '{"error":"this model requires a subscription"}',
      });

    const out = await runLocalDesktopTool(
      mockSender,
      'local_ollama_chat',
      {
        payload: {
          model: 'glm-5.1:cloud',
          messages: [{ role: 'user', content: 'hello' }],
          stream: true,
        },
      },
    );

    expect(out).toEqual({
      ok: false,
      error: 'Ollama API error: {"error":"this model requires a subscription"}',
    });
  });
});

describe('local_import_blast_radius (Phase 7)', () => {
  const mockSender = {
    isDestroyed: () => false,
    send: jest.fn(),
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.AIGENIUS_SECRET_TOKEN = 'test-token';
    global.fetch = jest.fn();
  });

  it('posts seed paths to sidecar import-graph and returns markdown outline', async () => {
    const outline = '# Import blast radius\n\n**Seeds:** `src/util.ts`';
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ outline }),
    });

    const out = await runLocalDesktopTool(mockSender, 'local_import_blast_radius', {
      paths: ['/home/dev/app/src/util.ts'],
      path_prefix: '/home/dev/app',
      max_depth: 3,
    });

    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:8001/search/import-graph',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          paths: ['/home/dev/app/src/util.ts'],
          pathPrefix: '/home/dev/app',
          maxDepth: 3,
        }),
      }),
    );
    expect(out).toEqual({ ok: true, result: outline });
  });

  it('returns error when sidecar responds non-OK', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 503 });

    const out = await runLocalDesktopTool(mockSender, 'local_import_blast_radius', {
      paths: ['/x.ts'],
    });

    expect(out).toEqual({ ok: false, error: 'Sidecar returned 503' });
  });
});
