import React, { useCallback, useState } from 'react';
import toast from 'react-hot-toast';
import { deriveChatSessionTitle } from '@/lib/utils/messageTextUtils';
import { downloadConversationTranscript, type TranscriptFormat } from '@/lib/utils/conversationTranscriptExport';
import { formatSessionRelativeTime } from '@/app/components/model-interface/conversation/sessionRecency';
import { SessionInfo } from './components/SessionInfo';
import { ActionButtons } from './components/ActionButtons';
import { getListItemClassName } from './utils/styles';
import { ChatHistoryListItemProps } from './types';

/**
 * Optimized ChatHistoryListItem using React.memo and stable props.
 * Modals have been lifted to the parent ChatHistoryList to reduce DOM bloat.
 */
const ChatHistoryListItem: React.FC<ChatHistoryListItemProps> = React.memo(({
    session,
    isActive,
    hasDraft = false,
    isGenerating = false,
    models,
    onSelect,
    onStarRequest,
    onDeleteRequest,
    onPublishRequest,
    isStarred,
    isPublished = false,
    isMobile = false,
    isDeleting = false,
    isStarring = false,
    isPublishing = false,
    getCachedMessages,
}) => {
    const [isDownloadingTranscript, setIsDownloadingTranscript] = useState(false);
    const [isUnread, setIsUnread] = useState(false);
    const wasGenerating = React.useRef(isGenerating);

    React.useEffect(() => {
        // If it just finished generating and we are not looking at it, mark it as unread
        if (wasGenerating.current && !isGenerating && !isActive) {
            setIsUnread(true);
        }
        wasGenerating.current = isGenerating;
    }, [isGenerating, isActive]);

    React.useEffect(() => {
        // If it becomes active, clear the unread state
        if (isActive) {
            setIsUnread(false);
        }
    }, [isActive]);
    const handleDeleteClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        onDeleteRequest(session);
    };

    const handleStarClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        onStarRequest(session);
    };

    const handlePublishClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        onPublishRequest?.(session);
    };

    const displayTitle = typeof session.title === 'string' && session.title.trim()
        ? session.title.trim()
        : deriveChatSessionTitle(session.messages?.[0]?.content);

    const relativeTime = formatSessionRelativeTime(session, { hasDraft });

    const handleDownloadTranscript = useCallback(async (format: TranscriptFormat) => {
        if (isDownloadingTranscript) return;

        setIsDownloadingTranscript(true);
        try {
            await downloadConversationTranscript(
                session,
                displayTitle || 'Untitled Chat',
                format,
                undefined,
                { getCachedMessages },
            );
        } catch (error) {
            console.error('Failed to download conversation transcript:', error);
            toast.error('Could not download transcript. Please try again.');
        } finally {
            setIsDownloadingTranscript(false);
        }
    }, [session, displayTitle, getCachedMessages, isDownloadingTranscript]);

    const handleItemClick = () => {
        // We still check isProcessing to prevent double clicks during global actions
        if (isDeleting || isStarring || isPublishing) {
            return;
        }
        onSelect(session);
    };

    return (
        <li
            className={getListItemClassName(isActive, isDeleting, isStarring, isStarred)}
            onClick={handleItemClick}
            {...(isActive ? { 'data-active-session': 'true' } : {})}
        >
            <SessionInfo
                title={displayTitle || 'Untitled Chat'}
                isActive={isActive}
                isGenerating={isGenerating}
                isUnread={isUnread}
                relativeTime={relativeTime}
            />


            <ActionButtons
                isStarred={isStarred}
                isStarring={isStarring}
                isDeleting={isDeleting}
                isPublished={isPublished}
                isPublishing={isPublishing}
                onStarClick={handleStarClick}
                onDeleteClick={handleDeleteClick}
                onPublishClick={onPublishRequest ? handlePublishClick : undefined}
                onDownloadTranscript={handleDownloadTranscript}
                isDownloadingTranscript={isDownloadingTranscript}
            />
        </li>
    );
});

ChatHistoryListItem.displayName = 'ChatHistoryListItem';

export default ChatHistoryListItem;
