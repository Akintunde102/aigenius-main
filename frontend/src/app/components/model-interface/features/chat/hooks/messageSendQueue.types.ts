import type { Model } from '@/app/components/model-interface/shared/types';

export interface QueuedComposerMessage {
    id: string;
    text: string;
    modelId: string;
    modelName: string;
    createdAt: number;
}

export type MessageSendQueueMap = Record<string, QueuedComposerMessage[]>;

export interface EnqueueComposerMessageInput {
    text: string;
    model: Model;
}

export interface HandleSendQueueOptions {
    /** Chat map slot to send into (defaults to the open view). */
    targetSessionKey?: string;
    /** Model snapshot for queued sends. */
    modelOverride?: Model;
}
