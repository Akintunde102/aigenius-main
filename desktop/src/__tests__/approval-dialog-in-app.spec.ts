import { EventEmitter } from 'events';
import {
  requestToolApprovalInApp,
  toolApprovalResponseChannel,
  TOOL_APPROVAL_REQUEST_CHANNEL,
} from '../approval-dialog-in-app';

jest.mock('electron', () => ({
  ipcMain: new EventEmitter(),
}));

describe('requestToolApprovalInApp', () => {
  const { ipcMain } = jest.requireMock('electron') as { ipcMain: EventEmitter };

  beforeEach(() => {
    ipcMain.removeAllListeners();
  });

  it('resolves true when the renderer approves', async () => {
    const webContents = {
      isDestroyed: () => false,
      send: jest.fn(),
    };
    const parent = {
      isDestroyed: () => false,
      webContents,
    };

    const promise = requestToolApprovalInApp(parent as never, 'patch', {
      count: 1,
      rows: [
        {
          variant: 'create',
          verb: 'Create',
          fileName: 'sample.cmd',
          directory: '~',
          fullPath: 'C:\\Users\\me\\sample.cmd',
        },
      ],
    });

    expect(webContents.send).toHaveBeenCalledWith(
      TOOL_APPROVAL_REQUEST_CHANNEL,
      expect.objectContaining({ kind: 'patch', payload: expect.any(Object) }),
    );

    const requestId = (webContents.send as jest.Mock).mock.calls[0][1].requestId as string;
    ipcMain.emit(toolApprovalResponseChannel(requestId), { sender: webContents }, true);

    await expect(promise).resolves.toBe(true);
  });

  it('rejects when the renderer is unavailable', async () => {
    const parent = {
      isDestroyed: () => true,
      webContents: { isDestroyed: () => true, send: jest.fn() },
    };

    await expect(
      requestToolApprovalInApp(parent as never, 'shell', {
        command: 'echo hi',
        cwdDisplay: '~',
        timeoutLabel: '60 s',
      }),
    ).rejects.toThrow(/unavailable/i);
  });
});
