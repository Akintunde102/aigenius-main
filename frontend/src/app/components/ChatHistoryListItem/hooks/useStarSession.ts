import { useState } from 'react';

interface UseStarSessionProps {
    sessionId?: string;
    isStarred: boolean;
    onStarToggle: (sessionId: string, isStarred: boolean) => Promise<void>;
}

export const useStarSession = ({
    sessionId,
    isStarred,
    onStarToggle
}: UseStarSessionProps) => {
    const [isStarring, setIsStarring] = useState(false);
    const [showStarModal, setShowStarModal] = useState(false);

    const executeStar = async () => {
        if (!sessionId) return;

        setIsStarring(true);
        try {
            // Toggle the star status - if currently starred, unstar it; if not starred, star it
            await onStarToggle(sessionId, !isStarred);
        } finally {
            setIsStarring(false);
        }
    };

    const handleStarClick = () => {
        setShowStarModal(true);
    };

    const handleConfirmStar = async () => {
        setShowStarModal(false);
        await executeStar();
    };

    const handleCancelStar = () => {
        setShowStarModal(false);
    };

    return {
        isStarring,
        showStarModal,
        handleStarClick,
        handleConfirmStar,
        handleCancelStar
    };
};
