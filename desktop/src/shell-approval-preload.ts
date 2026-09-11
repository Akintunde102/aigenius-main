import { contextBridge, ipcRenderer } from 'electron';

export type ShellApprovalPayload = {
  command: string;
  cwdDisplay: string;
  timeoutLabel: string;
};

contextBridge.exposeInMainWorld('aigeniusShellApproval', {
  platform: process.platform,
  bootstrap: (cb: (data: ShellApprovalPayload) => void) => {
    let delivered = false;
    const deliver = (data: ShellApprovalPayload): void => {
      if (delivered) {
        return;
      }
      delivered = true;
      cb(data);
    };
    ipcRenderer.on('aigenius-shell-approval-data', (_e, data: ShellApprovalPayload) => {
      deliver(data);
    });
    ipcRenderer.send('aigenius-shell-approval-ready');
  },
  done: (approved: boolean) => {
    ipcRenderer.send('aigenius-shell-approval-done', approved);
  },
});
