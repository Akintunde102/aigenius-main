import ee from 'event-emitter';

export const videoTrackingEmitter = ee({});

export interface VideoTrackingModalPayload {
    /** Full slug or job ID, e.g. "albino-woman-street_job-4646dced" */
    identifier: string;
    /** Optional friendly title for header */
    title?: string;
}

export const openVideoTrackingModal = (payload: VideoTrackingModalPayload) => {
    videoTrackingEmitter.emit('open', payload);
};

export const closeVideoTrackingModal = () => {
    videoTrackingEmitter.emit('close');
};
