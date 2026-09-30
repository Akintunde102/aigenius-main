import { useState } from 'react';
import { trackConversationDeleted } from '@/lib/analytics/product-events';

interface UseDeleteSessionProps {
    sessionId?: string;
    sessionTimestamp?: number;
    removeChatHistorySession: (id: string) => Promise<boolean>;
    removeChatHistorySessionById?: (id: string) => Promise<boolean>;
    onDeleteStart?: () => void;
    onDeleteEnd?: () => void;
}

export const useDeleteSession = ({
    sessionId,
    sessionTimestamp,
    removeChatHistorySession,
    removeChatHistorySessionById,
    onDeleteStart,
    onDeleteEnd
}: UseDeleteSessionProps) => {
    const [isDeleting, setIsDeleting] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);

    const executeDelete = async () => {
        setIsDeleting(true);
        onDeleteStart?.();

        try {
            let deleted = false;
            if (sessionId && removeChatHistorySessionById) {
                deleted = await removeChatHistorySessionById(sessionId);
            } else if (sessionId) {
                deleted = await removeChatHistorySession(sessionId);
            }
            if (deleted && sessionId) {
                trackConversationDeleted(sessionId);
            }
        } finally {
            setIsDeleting(false);
            onDeleteEnd?.();
        }
    };

    const handleDeleteClick = (isMobile: boolean) => {
        if (isMobile) {
            setShowDeleteModal(true);
        } else {
            executeDelete();
        }
    };

    const handleConfirmDelete = async () => {
        setShowDeleteModal(false);
        await executeDelete();
    };

    const handleCancelDelete = () => {
        setShowDeleteModal(false);
    };

    return {
        isDeleting,
        showDeleteModal,
        handleDeleteClick,
        handleConfirmDelete,
        handleCancelDelete
    };
};
