import { contextBridge, ipcRenderer } from 'electron';

export type ExternalLinkApprovalPayload = {
  url: string;
};

contextBridge.exposeInMainWorld('aigeniusExternalLinkApproval', {
  bootstrap: (cb: (data: ExternalLinkApprovalPayload) => void) => {
    let delivered = false;
    const deliver = (data: ExternalLinkApprovalPayload): void => {
      if (delivered) {
        return;
      }
      delivered = true;
      cb(data);
    };
    ipcRenderer.on('aigenius-external-link-approval-data', (_e, data: ExternalLinkApprovalPayload) => {
      deliver(data);
    });
    ipcRenderer.send('aigenius-external-link-approval-ready');
  },
  done: (approved: boolean) => {
    ipcRenderer.send('aigenius-external-link-approval-done', approved);
  },
});
