import { contextBridge, ipcRenderer } from 'electron';

export type ShellApprovalPayload = {
  command: string;
  cwdDisplay: string;
  timeoutLabel: string;
};

contextBridge.exposeInMainWorld('aigeniusShellApproval', {
  bootstrap: (cb: (data: ShellApprovalPayload) => void) => {
    ipcRenderer.once('aigenius-shell-approval-data', (_e, data: ShellApprovalPayload) => {
      cb(data);
    });
    ipcRenderer.send('aigenius-shell-approval-ready');
  },
  done: (approved: boolean) => {
    ipcRenderer.send('aigenius-shell-approval-done', approved);
  },
});
