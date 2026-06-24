import { useState } from 'react';
import { ChatSession } from '@/app/components/model-interface/shared/types';

interface UsePublishSessionProps {
    sessionId?: string;
    session: ChatSession;
    isPublished?: boolean;
    onPublish?: (session: ChatSession, isRepublishing?: boolean, existingUrl?: string) => void;
}

export function usePublishSession({
    sessionId,
    session,
    isPublished = false,
    onPublish
}: UsePublishSessionProps) {
    const [isPublishing, setIsPublishing] = useState(false);
    const [showPublishModal, setShowPublishModal] = useState(false);

    const handlePublishClick = () => {
        if (!onPublish) return;

        const existingUrl = isPublished
            ? `${window.location.origin}/published-conversations/${sessionId}`
            : undefined;

        onPublish(session, isPublished, existingUrl);
    };

    const handleStartPublish = () => {
        setIsPublishing(true);
    };

    const handleEndPublish = () => {
        setIsPublishing(false);
    };

    return {
        isPublishing,
        showPublishModal,
        handlePublishClick,
        handleStartPublish,
        handleEndPublish,
        setShowPublishModal
    };
}

