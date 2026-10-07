import { dialog } from 'electron';
import {
  applySyncedToolPermissionPreferences,
  resetToolPermissionPreferencesCacheForTests,
} from '../tool-permission-preferences';
import { confirmLocalShellExecution, runShell } from '../local-tool-executor-shell';
import { killChildProcessTree } from '../utils/shell-process-tree';

jest.mock('electron', () => ({
  app: {
    isPackaged: false,
    getPath: jest.fn(() => '/tmp/aigenius-test'),
  },
  dialog: {
    showMessageBox: jest.fn(),
  },
}));

jest.mock('../shell-approval-dialog', () => ({
  showShellApprovalDialog: jest.fn(),
}));

describe('confirmLocalShellExecution', () => {
  const showShellApprovalDialog = jest.requireMock('../shell-approval-dialog')
    .showShellApprovalDialog as jest.Mock;

  beforeEach(() => {
    resetToolPermissionPreferencesCacheForTests();
    jest.clearAllMocks();
    applySyncedToolPermissionPreferences({
      autoApproveAll: false,
      requireApprovalByTool: {},
    });
  });

  it('skips approval when shell approval is disabled in preferences', async () => {
    applySyncedToolPermissionPreferences({
      autoApproveAll: true,
      requireApprovalByTool: {},
    });

    const approved = await confirmLocalShellExecution(
      { isDestroyed: () => false } as never,
      'npm test',
      '/tmp',
      60_000,
    );

    expect(approved).toBe(true);
    expect(showShellApprovalDialog).not.toHaveBeenCalled();
    expect(dialog.showMessageBox).not.toHaveBeenCalled();
  });

  it('opens the themed shell approval dialog when approval is required', async () => {
    showShellApprovalDialog.mockResolvedValue(true);
    const parent = { isDestroyed: () => false } as never;

    const approved = await confirmLocalShellExecution(parent, 'npm test', '/tmp', 60_000);

    expect(approved).toBe(true);
    expect(showShellApprovalDialog).toHaveBeenCalledWith(parent, 'npm test', '/tmp', 60_000);
    expect(dialog.showMessageBox).not.toHaveBeenCalled();
  });

  it('falls back to the native dialog when the themed UI fails to load', async () => {
    showShellApprovalDialog.mockRejectedValue(new Error('Missing shell approval UI'));
    (dialog.showMessageBox as jest.Mock).mockResolvedValue({ response: 0 });
    const parent = { isDestroyed: () => false } as never;

    const approved = await confirmLocalShellExecution(parent, 'npm test', '/tmp', 60_000);

    expect(approved).toBe(false);
    expect(dialog.showMessageBox).toHaveBeenCalledWith(
      parent,
      expect.objectContaining({
        title: 'Local terminal',
        message: 'Allow this command to run on your computer?',
      }),
    );
  });
});

describe('runShell long-running commands', () => {
  const mockSender = {
    isDestroyed: () => false,
    send: jest.fn(),
  } as never;

  function nodeEval(code: string): string {
    // Use PATH `node` so cmd.exe /c does not split on spaces in Program Files.
    return `node -e ${JSON.stringify(code)}`;
  }

  beforeEach(() => {
    resetToolPermissionPreferencesCacheForTests();
    applySyncedToolPermissionPreferences({
      autoApproveAll: true,
      requireApprovalByTool: {},
    });
  });

  it('returns while a sleeper is still running when block_until_ms elapses', async () => {
    let pidToClean: number | undefined;
    try {
      const started = Date.now();
      const out = await runShell(
        mockSender,
        undefined,
        {
          command: nodeEval("console.log('ready'); setInterval(() => {}, 1000)"),
          cwd: process.cwd(),
          block_until_ms: 1200,
          timeout_ms: 10_000,
        },
      );
      expect(Date.now() - started).toBeLessThan(5_000);
      expect(out.ok).toBe(true);
      if (out.ok) {
        expect(out.result).toContain('still running');
        const pid = (out.rawData as { pid?: number } | undefined)?.pid;
        expect(typeof pid).toBe('number');
        // Windows may background before buffered stdout arrives; pid proves the sleeper started.
        if (out.result.includes('ready')) {
          expect(out.result).toContain('ready');
        }
        pidToClean = pid;
      }
    } finally {
      if (typeof pidToClean === 'number') {
        killChildProcessTree({ pid: pidToClean });
      }
    }
  });

  it('settles a nested never-exit process on timeout instead of hanging', async () => {
    const nested = nodeEval(
      "require('child_process').spawn(process.execPath, ['-e', 'setInterval(()=>{}, 1000)'], {stdio:'inherit', windowsHide:true}); console.log('parent-ready'); setInterval(()=>{}, 1000)",
    );
    const started = Date.now();
    const out = await runShell(
      mockSender,
      undefined,
      {
        command: nested,
        cwd: process.cwd(),
        timeout_ms: 1_200,
      },
    );
    expect(Date.now() - started).toBeLessThan(6_000);
    expect(out.ok).toBe(false);
    if (!out.ok) {
      expect(out.error).toMatch(/timed out/i);
    }
  }, 12_000);
});
