import { dialog } from 'electron';
import {
  applySyncedToolPermissionPreferences,
  resetToolPermissionPreferencesCacheForTests,
} from '../tool-permission-preferences';
import { confirmLocalShellExecution } from '../local-tool-executor-shell';

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
