import React, { useCallback } from 'react';
import { deriveChatSessionTitle } from '@/lib/utils/messageTextUtils';
import { downloadConversationTranscript, type TranscriptFormat } from '@/lib/utils/conversationTranscriptExport';
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
    isPublishing = false
}) => {
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

    const handleDownloadTranscript = useCallback((format: TranscriptFormat) => {
        downloadConversationTranscript(session, displayTitle || 'Untitled Chat', format);
    }, [session, displayTitle]);

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
            />
        </li>
    );
});

ChatHistoryListItem.displayName = 'ChatHistoryListItem';

export default ChatHistoryListItem;
