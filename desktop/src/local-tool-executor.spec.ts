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
  resolveLocalImagePath: jest.fn(async (inputPath: string) => {
    if (!inputPath?.trim()) {
      return { ok: false, error: 'Error: file not found — path is required' };
    }
    const resolved = inputPath.startsWith('/') || /^[A-Za-z]:/.test(inputPath)
      ? inputPath
      : `/home/user/${inputPath}`;
    return { ok: true, resolved, displayPath: inputPath };
  }),
  resolveDirectoryPath: jest.fn(async (inputPath: string) => {
    if (!inputPath?.trim()) {
      return { ok: false, error: 'path is required' };
    }
    const resolved =
      inputPath.startsWith('/') || /^[A-Za-z]:/.test(inputPath)
        ? inputPath
        : `/home/user/${inputPath}`;
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
  stat: jest.fn().mockResolvedValue({ isFile: () => true, isDirectory: () => false, size: 5 }),
  readFile: jest.fn().mockResolvedValue(Buffer.from('hello')),
  realpath: jest.fn((p: string) => Promise.resolve(p)),
}));

// Mock Electron
jest.mock('electron', () => ({
  app: { isPackaged: false },
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
      stat: jest.fn().mockResolvedValue({ size: mockContent.length }),
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
      expect(out.result).not.toMatch(/\*\*Shell\*\*/);
    }
  });

  it('ignores a leftover command key on local_list_directory', async () => {
    (listDirectoryViaShell as jest.Mock).mockResolvedValue({
      shellCommand: "Get-ChildItem -LiteralPath 'C:\\Users\\Test' -Force",
      structured: true,
      items: [
        { name: 'apps', path: 'C:\\Users\\Test\\apps', isDir: true },
      ],
    });

    const out = await runLocalDesktopTool(mockSender, 'local_list_directory', {
      path: 'C:\\Users\\Test',
      command: 'Get-ChildItem -Force | Select-Object Name',
    });

    expect(out.ok).toBe(true);
    if (out.ok) {
      expect(out.result).toContain('apps');
      expect(out.result).not.toMatch(/command` was ignored/i);
      expect(out.result).not.toMatch(/Select-Object/i);
    }
    expect((listDirectoryViaShell as jest.Mock).mock.calls[0][1].command).toBeUndefined();
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

describe('local_upload_file', () => {
  const mockSender = {
    isDestroyed: () => false,
    send: jest.fn(),
  } as any;

  beforeEach(() => {
    const { dialog } = jest.requireMock('electron') as {
      dialog: { showMessageBox: jest.Mock };
    };
    dialog.showMessageBox.mockResolvedValue({ response: 1 });
    (fs.stat as jest.Mock).mockResolvedValue({ isFile: () => true, isDirectory: () => false, size: 5 });
    (fs.readFile as jest.Mock).mockResolvedValue(Buffer.from('hello'));
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 201,
      text: async () => JSON.stringify({ id: 'file-1', s3Link: 'https://res.cloudinary.com/demo/raw/upload/notes.txt' }),
    });
  });

  it('posts the local file to the gateway stream route tagged uploadedBy=model', async () => {
    const out = await runLocalDesktopTool(mockSender, 'local_upload_file', {
      path: '/tmp/notes.txt',
      __gatewayUpload: {
        apiRoot: 'http://127.0.0.1:28000',
        accessToken: 'user-token',
        conversationId: '11111111-1111-4111-8111-111111111111',
      },
    });

    expect(out.ok).toBe(true);
    const fetchMock = global.fetch as jest.Mock;
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/gateway/*/upload/stream?');
    expect(url).toContain('uploadedBy=model');
    expect(url).toContain('fileName=notes.txt');
    expect(url).toContain('conversationId=11111111-1111-4111-8111-111111111111');
    expect(init.method).toBe('POST');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer user-token');
    expect((init.headers as Record<string, string>)['Content-Type']).toBe('text/plain');
  });

  it('rejects an unsupported extension before upload', async () => {
    const out = await runLocalDesktopTool(mockSender, 'local_upload_file', {
      path: '/tmp/notes.exe',
      file_name: 'notes.exe',
      __gatewayUpload: {
        apiRoot: 'http://127.0.0.1:28000',
        accessToken: 'user-token',
      },
    });

    expect(out).toEqual({ ok: false, error: 'Unsupported file extension' });
    expect(global.fetch).not.toHaveBeenCalled();
  });
});

describe('publish_html (desktop)', () => {
  const mockSender = {
    isDestroyed: () => false,
    send: jest.fn(),
  } as any;

  beforeEach(() => {
    (fs.stat as jest.Mock).mockResolvedValue({ isFile: () => true, isDirectory: () => false, size: 50 });
    (fs.readFile as jest.Mock).mockResolvedValue('<!DOCTYPE html><html><body><h1>Quiz App</h1></body></html>');
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ success: true, id: 'page-123', url: 'https://quiz.ai-genius.org' }),
    });
  });

  it('reads local HTML file and POSTs to /v1/*/pages directly', async () => {
    const out = await runLocalDesktopTool(mockSender, 'publish_html', {
      filePath: '/tmp/quiz.html',
      slug: 'quiz-app',
      title: 'Quiz App',
      __gatewayUpload: {
        apiRoot: 'http://127.0.0.1:28000',
        accessToken: 'user-token',
      },
    });

    expect(out.ok).toBe(true);
    const fetchMock = global.fetch as jest.Mock;
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('http://127.0.0.1:28000/v1/*/pages');
    expect(init.method).toBe('POST');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer user-token');
    const sentBody = JSON.parse(init.body as string);
    expect(sentBody.html).toContain('<!DOCTYPE html>');
    expect(sentBody.slug).toBe('quiz-app');
    expect(sentBody.title).toBe('Quiz App');
  });

  it('rejects file without valid HTML signatures', async () => {
    (fs.readFile as jest.Mock).mockResolvedValue('plain non-html text file');
    const out = await runLocalDesktopTool(mockSender, 'publish_html', {
      filePath: '/tmp/not-html.txt',
      __gatewayUpload: {
        apiRoot: 'http://127.0.0.1:28000',
        accessToken: 'user-token',
      },
    });

    expect(out).toEqual({
      ok: false,
      error: 'The specified file does not appear to contain valid HTML content.',
    });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('rejects when filePath is missing', async () => {
    const out = await runLocalDesktopTool(mockSender, 'publish_html', {
      __gatewayUpload: {
        apiRoot: 'http://127.0.0.1:28000',
        accessToken: 'user-token',
      },
    });

    expect(out).toEqual({
      ok: false,
      error: 'filePath is required for desktop publish_html',
    });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('rejects an empty file', async () => {
    (fs.stat as jest.Mock).mockResolvedValue({ isFile: () => true, isDirectory: () => false, size: 0 });
    const out = await runLocalDesktopTool(mockSender, 'publish_html', {
      filePath: '/tmp/empty.html',
      __gatewayUpload: {
        apiRoot: 'http://127.0.0.1:28000',
        accessToken: 'user-token',
      },
    });

    expect(out).toEqual({
      ok: false,
      error: 'File is empty',
    });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('rejects a file exceeding the 2MB size cap', async () => {
    (fs.stat as jest.Mock).mockResolvedValue({ isFile: () => true, isDirectory: () => false, size: 3 * 1024 * 1024 });
    const out = await runLocalDesktopTool(mockSender, 'publish_html', {
      filePath: '/tmp/giant.html',
      __gatewayUpload: {
        apiRoot: 'http://127.0.0.1:28000',
        accessToken: 'user-token',
      },
    });

    expect(out.ok).toBe(false);
    if (!out.ok) {
      expect(out.error).toContain('larger than the 2097152 byte (2MB) limit');
    }
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('sends PUT to /v1/*/pages/:id when page_id is provided for an update', async () => {
    const out = await runLocalDesktopTool(mockSender, 'publish_html', {
      filePath: '/tmp/update.html',
      page_id: '11111111-2222-3333-4444-555555555555',
      slug: 'my-quiz',
      __gatewayUpload: {
        apiRoot: 'http://127.0.0.1:28000',
        accessToken: 'user-token',
      },
    });

    expect(out.ok).toBe(true);
    const fetchMock = global.fetch as jest.Mock;
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('http://127.0.0.1:28000/v1/*/pages/11111111-2222-3333-4444-555555555555');
    expect(init.method).toBe('PUT');
  });

  it('returns server error message on non-200 responses', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 400,
      text: async () => JSON.stringify({ message: 'Slug is already in use by another page' }),
    });

    const out = await runLocalDesktopTool(mockSender, 'publish_html', {
      filePath: '/tmp/quiz.html',
      slug: 'taken-slug',
      __gatewayUpload: {
        apiRoot: 'http://127.0.0.1:28000',
        accessToken: 'user-token',
      },
    });

    expect(out).toEqual({
      ok: false,
      error: 'Slug is already in use by another page',
    });
  });
});

describe('host_markdown (desktop)', () => {
  const mockSender = {
    isDestroyed: () => false,
    send: jest.fn(),
  } as any;

  beforeEach(() => {
    (fs.stat as jest.Mock).mockResolvedValue({ isFile: () => true, isDirectory: () => false, size: 120 });
    (fs.readFile as jest.Mock).mockResolvedValue('# Guide\n\nHello from disk.');
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ success: true, slug: 'guide', path: '/h/guide' }),
    });
  });

  it('reads local markdown and POSTs to /gateway/*/hosted-files', async () => {
    const out = await runLocalDesktopTool(mockSender, 'host_markdown', {
      action: 'publish',
      filePath: '/tmp/guide.md',
      slug: 'guide',
      __gatewayUpload: {
        apiRoot: 'http://127.0.0.1:28000',
        accessToken: 'user-token',
      },
    });

    expect(out.ok).toBe(true);
    const fetchMock = global.fetch as jest.Mock;
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('http://127.0.0.1:28000/gateway/*/hosted-files');
    expect(init.method).toBe('POST');
    const sentBody = JSON.parse(init.body as string);
    expect(sentBody.markdown).toContain('# Guide');
    expect(sentBody.publish).toBe(true);
    expect(sentBody.slug).toBe('guide');
  });

  it('rejects non-markdown file extensions', async () => {
    const out = await runLocalDesktopTool(mockSender, 'host_markdown', {
      action: 'publish',
      filePath: '/tmp/notes.txt',
      __gatewayUpload: {
        apiRoot: 'http://127.0.0.1:28000',
        accessToken: 'user-token',
      },
    });

    expect(out).toEqual({
      ok: false,
      error: 'filePath must point to a .md or .markdown file',
    });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('rejects HTML content masquerading as markdown', async () => {
    (fs.readFile as jest.Mock).mockResolvedValue('<!DOCTYPE html><html><body></body></html>');
    const out = await runLocalDesktopTool(mockSender, 'host_markdown', {
      action: 'publish',
      filePath: '/tmp/page.md',
      __gatewayUpload: {
        apiRoot: 'http://127.0.0.1:28000',
        accessToken: 'user-token',
      },
    });

    expect(out).toEqual({
      ok: false,
      error: 'HTML documents cannot be hosted as Markdown pages',
    });
    expect(global.fetch).not.toHaveBeenCalled();
  });
});

describe('local_read_file circuit breaker', () => {
  const mockSender = {
    isDestroyed: () => false,
    send: jest.fn(),
  } as any;

  it('triggers circuit breaker after 8 repeated reads of the same file', async () => {
    const { resetFileReadHistoryForTests } = await import('./local-tool-executor-fs');
    resetFileReadHistoryForTests();

    for (let i = 1; i <= 7; i++) {
      await runLocalDesktopTool(mockSender, 'local_read_file', { path: '/tmp/loop-file.txt' });
    }

    const eighth = await runLocalDesktopTool(mockSender, 'local_read_file', { path: '/tmp/loop-file.txt' });
    expect(eighth.ok).toBe(false);
    if (!eighth.ok) {
      expect(eighth.error).toContain('You have read "/tmp/loop-file.txt" 8 times in small chunks');
      expect(eighth.error).toContain('host_markdown');
    }

    resetFileReadHistoryForTests();
  });

  it('does not trigger circuit breaker when reading different files', async () => {
    const { resetFileReadHistoryForTests } = await import('./local-tool-executor-fs');
    resetFileReadHistoryForTests();

    for (let i = 1; i <= 10; i++) {
      const res = await runLocalDesktopTool(mockSender, 'local_read_file', { path: `/tmp/file-${i}.txt` });
      expect(res.ok).toBe(true);
    }

    resetFileReadHistoryForTests();
  });
});

