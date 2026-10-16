import ee from 'event-emitter';

export const speechTrackingEmitter = ee({});

export interface SpeechTrackingModalPayload {
    identifier: string;
    title?: string;
}

export const openSpeechTrackingModal = (payload: SpeechTrackingModalPayload) => {
    speechTrackingEmitter.emit('open', payload);
};

export const closeSpeechTrackingModal = () => {
    speechTrackingEmitter.emit('close');
};
