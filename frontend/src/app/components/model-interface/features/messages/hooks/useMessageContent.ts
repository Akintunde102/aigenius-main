import { useMemo } from 'react';
import {
    normalizeMessageContent as normalizeMessageContentLib,
    parseFileMessageFromString,
} from '@/lib/utils/messageContentUtils';

/** Re-export for consumers; single source of truth in lib/utils/messageContentUtils. */
export { normalizeMessageContent, normalizeChatMessages } from '@/lib/utils/messageContentUtils';

/** Wrapper for hook use: ensures content is normalized (handles unknown from API/storage). */
function normalizeForDisplay(content: unknown): unknown {
    return normalizeMessageContentLib(content);
}

export const useMessageContent = (content: unknown) => {
    return useMemo(() => {
        const raw = normalizeForDisplay(content);

        let isImageMsg = false;
        let imageUrl = '';
        let isFileMsg = false;
        let fileUrl = '';
        let fileName = '';
        let isAudioMsg = false;
        let audioFormat = '';
        let isStructuredContent = false;
        let structuredContent: Array<{
            type: string;
            text?: string;
            image_url?: { url: string };
        }> = [];

        try {
            if (Array.isArray(raw)) {
                isStructuredContent = true;
                structuredContent = raw;

                // Check for audio content
                const audioBlock = raw.find((b: any) => b && b.type === 'input_audio' && b.input_audio && b.input_audio.data);
                if (audioBlock && audioBlock.input_audio) {
                    isAudioMsg = true;
                    audioFormat = audioBlock.input_audio.format || 'wav';
                    const data = audioBlock.input_audio.data;
                    fileUrl = data.startsWith('http') ? data : `data:audio/${audioFormat};base64,${data}`;
                    fileName = `audio.${audioFormat}`;
                }
            } else if (typeof raw === 'string') {
                const parsedFileMessage = parseFileMessageFromString(raw);
                if (parsedFileMessage.isFileMsg) {
                    isFileMsg = true;
                    fileUrl = parsedFileMessage.fileUrl;
                    fileName = parsedFileMessage.fileName;
                }
            }
        } catch { }


        return {
            isImageMsg,
            imageUrl,
            isFileMsg,
            fileUrl,
            fileName,
            isAudioMsg,
            audioFormat,
            isStructuredContent,
            structuredContent
        };
    }, [content]);
};
