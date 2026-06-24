import { contextBridge, ipcRenderer } from 'electron';

export type ExternalLinkApprovalPayload = {
  url: string;
};

contextBridge.exposeInMainWorld('aigeniusExternalLinkApproval', {
  bootstrap: (cb: (data: ExternalLinkApprovalPayload) => void) => {
    ipcRenderer.once('aigenius-external-link-approval-data', (_e, data: ExternalLinkApprovalPayload) => {
      cb(data);
    });
    ipcRenderer.send('aigenius-external-link-approval-ready');
  },
  done: (approved: boolean) => {
    ipcRenderer.send('aigenius-external-link-approval-done', approved);
  },
});
