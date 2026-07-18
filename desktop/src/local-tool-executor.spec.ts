import { runLocalDesktopTool, resolveShellProcessClose } from './local-tool-executor';
import fs from 'fs/promises';
import { ReadableStream } from 'stream/web';
import {
  clearPreviewPathRegistryForTests,
  isPreviewPathRegistered,
} from './preview-path-registry';

// Mock fs/promises
jest.mock('fs/promises', () => ({
  open: jest.fn(),
  readdir: jest.fn(),
  stat: jest.fn(),
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

  it('formats local_index_status as readable Markdown instead of raw JSON', async () => {
    const mockStatus = {
      indexed: 1234,
      watching: true,
      lastRun: 1625097600000,
    };

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockStatus,
    });

    const out = await runLocalDesktopTool(mockSender, 'local_index_status', {});

    expect(out.ok).toBe(true);
    if (out.ok) {
      // RED PHASE: This will fail as it currently returns JSON
      expect(out.result).toContain('Local index status');
      expect(out.result).toContain('1,234');
      expect(out.result).not.toContain('{"indexed":');
    }
  });

  it('formats local_read_file as readable Markdown instead of raw JSON', async () => {
    const mockContent = 'Hello World from a local file!';
    const mockFd = {
      read: jest.fn().mockResolvedValue({ bytesRead: mockContent.length }),
      close: jest.fn(),
    };
    (fs.open as jest.Mock).mockResolvedValue(mockFd);

    const out = await runLocalDesktopTool(mockSender, 'local_read_file', { path: '/home/user/test.txt' });

    expect(out.ok).toBe(true);
    if (out.ok) {
      expect(out.result).toContain('### Read file');
      expect(out.result).toContain('`/home/user/test.txt`');
      expect(out.result).toContain('- **Bytes read**: 30');
      expect(out.result).not.toContain('- **Truncated**');
      expect(out.result).not.toContain('{"path":');
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
    const mockEntries = [
      { name: 'file1.txt', isDirectory: () => false },
      { name: 'subdir', isDirectory: () => true },
    ] as any;

    jest.spyOn(fs, 'readdir').mockResolvedValue(mockEntries);
    jest.spyOn(fs, 'stat').mockResolvedValue({ size: 100, mtimeMs: 123456789 } as any);

    const out = await runLocalDesktopTool(mockSender, 'local_list_directory', { path: 'C:\\Users\\Test' });

    expect(out.ok).toBe(true);
    if (out.ok) {
      expect(out.result).toContain('### Directory listing');
      expect(out.result).toContain('file1.txt');
      expect(out.result).toContain('subdir');
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

    expect(global.fetch).toHaveBeenCalledWith('http://127.0.0.1:11434/api/chat', expect.objectContaining({
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

    expect(global.fetch).toHaveBeenNthCalledWith(1, 'http://127.0.0.1:11434/api/pull', {
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
