import React, { useState } from 'react';
import { deriveChatSessionTitle } from '@/lib/utils/messageTextUtils';
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
    onStopGenerating,
    models,
    onSelect,
    onPrefetchTranscript,
    onStarRequest,
    onDeleteRequest,
    onPublishRequest,
    onTranscriptRequest,
    onAssignLabelsRequest,
    isStarred,
    isPublished = false,
    isMobile = false,
    isDeleting = false,
    isStarring = false,
    isPublishing = false,
    conversationLabels,
    sidebarOrganization = 'flat',
}) => {
    const [isUnread, setIsUnread] = useState(false);
    const wasGenerating = React.useRef(isGenerating);

    const assignedLabels = React.useMemo(() => {
        if (!session.labelIds?.length || !conversationLabels?.length) return [];
        const labelMap = new Map(conversationLabels.map((l) => [l.id, l]));
        return session.labelIds
            .map((id) => labelMap.get(id))
            .filter((l): l is NonNullable<typeof l> => Boolean(l));
    }, [session.labelIds, conversationLabels]);

    React.useEffect(() => {
        if (wasGenerating.current && !isGenerating && !isActive) {
            setIsUnread(true);
        }
        wasGenerating.current = isGenerating;
    }, [isGenerating, isActive]);

    React.useEffect(() => {
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

    const handleOpenTranscript = (e: React.MouseEvent) => {
        e.stopPropagation();
        onTranscriptRequest?.(session);
    };

    const displayTitle = typeof session.title === 'string' && session.title.trim()
        ? session.title.trim()
        : deriveChatSessionTitle(session.messages?.[0]?.content);

    const relativeTime = formatSessionRelativeTime(session, { hasDraft });

    const handleItemClick = () => {
        if (isDeleting || isStarring || isPublishing) {
            return;
        }
        onSelect(session);
    };

    return (
        <li
            className={getListItemClassName(isActive, isDeleting, isStarring, isStarred)}
            onClick={handleItemClick}
            onPointerEnter={onPrefetchTranscript}
            onFocus={onPrefetchTranscript}
            {...(isActive ? { 'data-active-session': 'true' } : {})}
        >
            <SessionInfo
                title={displayTitle || 'Untitled Chat'}
                isActive={isActive}
                isGenerating={isGenerating}
                onStopGenerating={isGenerating ? onStopGenerating : undefined}
                isUnread={isUnread}
                relativeTime={relativeTime}
                labels={sidebarOrganization === 'flat' ? assignedLabels : undefined}
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
                onOpenTranscript={onTranscriptRequest ? handleOpenTranscript : undefined}
                onAssignLabelsClick={onAssignLabelsRequest ? () => onAssignLabelsRequest(session) : undefined}
            />
        </li>
    );
});

ChatHistoryListItem.displayName = 'ChatHistoryListItem';

export default ChatHistoryListItem;
