import { runLocalDesktopTool } from '../local-tool-executor';
import * as formatter from '../utils/tool-formatter';

// Mock Electron
jest.mock('electron', () => ({
  dialog: {
    showMessageBox: jest.fn(),
  },
}));

// Mock resolve-browser-window-for-ipc
jest.mock('../resolve-browser-window-for-ipc', () => ({
  resolveBrowserWindowForIpcSender: jest.fn().mockReturnValue({}),
}));

// Mock formatters
jest.spyOn(formatter, 'formatRagResults').mockReturnValue({ result: 'Formatted RAG', rawData: { hits: [] } });
jest.spyOn(formatter, 'formatIndexStatus').mockReturnValue({ result: 'Formatted Status', rawData: { indexed: 0 } });

describe('local-tool-executor', () => {
  const mockSender = {} as any;
  const originalToken = process.env.AIGENIUS_SECRET_TOKEN;
  let consoleErrorSpy: jest.SpyInstance;

  beforeAll(() => {
    process.env.AIGENIUS_SECRET_TOKEN = 'test-token';
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterAll(() => {
    process.env.AIGENIUS_SECRET_TOKEN = originalToken;
    consoleErrorSpy.mockRestore();
  });

  beforeEach(() => {
    global.fetch = jest.fn();
    jest.clearAllMocks();
  });

  describe('runLocalDesktopTool - local_rag_query (RAG)', () => {
    it('should return a structured object with result and rawData from the sidecar', async () => {
      const mockSidecarResponse = {
        ok: true,
        json: async () => ({ hits: [], hit_count: 0 }),
        status: 200,
      };
      (global.fetch as jest.Mock).mockResolvedValue(mockSidecarResponse);

      const res = await runLocalDesktopTool(mockSender, 'local_rag_query', { query: 'test' });

      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.result).toBe('Formatted RAG');
        expect(res.rawData).toEqual({ hits: [] });
      }
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/search/rag'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({ Authorization: 'Bearer test-token' }),
        })
      );
    });

    it('should return error if sidecar fails', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => 'Internal Server Error',
      });

      const res = await runLocalDesktopTool(mockSender, 'local_rag_query', { query: 'test' });

      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.error).toContain('Sidecar returned 500');
      }
    });

    it('should return error if AIGENIUS_SECRET_TOKEN is missing', async () => {
      delete process.env.AIGENIUS_SECRET_TOKEN;
      const res = await runLocalDesktopTool(mockSender, 'local_rag_query', { query: 'test' });
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.error).toContain('AIGENIUS_SECRET_TOKEN is not set');
      }
      process.env.AIGENIUS_SECRET_TOKEN = 'test-token';
    });
  });

  describe('runLocalDesktopTool - shell alias compatibility', () => {
    it('accepts legacy local_shell as an alias of run_command', async () => {
      const { dialog } = jest.requireMock('electron') as {
        dialog: { showMessageBox: jest.Mock };
      };
      dialog.showMessageBox.mockResolvedValue({ response: 1 });

      const res = await runLocalDesktopTool(mockSender, 'local_shell', { command: 'echo hello' });

      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.result).toContain('Shell output');
        expect(res.result).toContain('- **Exit code**: 0');
        expect(res.result).toContain('hello');
      }
    });
  });

  describe('runLocalDesktopTool - local_index_status', () => {
    it('should return structured status', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ indexed: 123 }),
        status: 200,
      });

      const res = await runLocalDesktopTool(mockSender, 'local_index_status', {});

      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.result).toBe('Formatted Status');
        expect(res.rawData).toEqual({ indexed: 0 });
      }
    });
  });
});
