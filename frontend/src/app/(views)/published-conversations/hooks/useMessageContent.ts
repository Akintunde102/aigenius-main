import { useMemo } from 'react';

export const useMessageContent = (content: any) => {
    return useMemo(() => {
        let isImageMsg = false;
        let imageUrl = '';
        let imageText = '';
        let isFileMsg = false;
        let fileUrl = '';
        let fileName = '';
        let isAudioMsg = false;
        let audioFormat = '';

        try {
            if (Array.isArray(content)) {
                // Check for image_url type with imageText (based on user's format)
                const imageBlock = content.find((b: any) => b && b.type === 'image_url' && b.image_url?.url);
                if (imageBlock) {
                    isImageMsg = true;
                    imageUrl = imageBlock.image_url.url;
                    imageText = imageBlock.imageText || imageBlock.text || ''; // Support both imageText and text fields
                } else {
                    // Check for legacy single image format (backward compatibility)
                    if (content[0]?.type === 'image_url' && content[0]?.image_url?.url) {
                        isImageMsg = true;
                        imageUrl = content[0].image_url.url;
                        imageText = content[0].imageText || content[0].text || '';
                    }

                    // Check for audio content
                    const audioBlock = content.find((b: any) => b && b.type === 'input_audio' && b.input_audio && b.input_audio.data);
                    if (audioBlock && audioBlock.input_audio) {
                        isAudioMsg = true;
                        audioFormat = audioBlock.input_audio.format || 'wav';
                        const data = audioBlock.input_audio.data;
                        fileUrl = data.startsWith('http') ? data : `data:audio/${audioFormat};base64,${data}`;
                        fileName = `audio.${audioFormat}`;
                    }
                }
            } else if (typeof content === 'string' && content.startsWith('<a href=')) {
                const match = content.match(/href='([^']+)'[^>]*>([^<]+)<\/a>/);
                if (match) {
                    isFileMsg = true;
                    fileUrl = match[1];
                    fileName = match[2];
                }
            }
        } catch { }

        return { isImageMsg, imageUrl, imageText, isFileMsg, fileUrl, fileName, isAudioMsg, audioFormat };
    }, [content]);
};
