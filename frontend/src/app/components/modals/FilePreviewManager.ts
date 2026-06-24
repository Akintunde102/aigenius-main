import ee from 'event-emitter';

export const filePreviewEmitter = ee({});

export interface FilePreviewPayload {
    url: string;
    name: string;
    type: 'image' | 'code' | 'pdf' | 'video' | 'audio' | 'folder' | 'unsupported';
    localPath?: string;
    textContent?: string;
}

export const openFilePreview = (payload: FilePreviewPayload) => {
    filePreviewEmitter.emit('open', payload);
};

export const closeFilePreview = () => {
    filePreviewEmitter.emit('close');
};
