import { contextBridge, ipcRenderer } from 'electron';

export type PatchApprovalPayload = {
  count: number;
  rows: Array<{
    variant: 'create' | 'update' | 'delete';
    verb: string;
    fileName: string;
    directory: string;
    fullPath: string;
  }>;
};

contextBridge.exposeInMainWorld('aigeniusPatchApproval', {
  bootstrap: (cb: (data: PatchApprovalPayload) => void) => {
    let delivered = false;
    const deliver = (data: PatchApprovalPayload): void => {
      if (delivered) {
        return;
      }
      delivered = true;
      cb(data);
    };
    ipcRenderer.on('aigenius-patch-approval-data', (_e, data: PatchApprovalPayload) => {
      deliver(data);
    });
    ipcRenderer.send('aigenius-patch-approval-ready');
  },
  done: (approved: boolean) => {
    ipcRenderer.send('aigenius-patch-approval-done', approved);
  },
});
