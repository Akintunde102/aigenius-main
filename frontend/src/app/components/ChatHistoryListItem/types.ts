import { ChatSession, Model } from '@/app/components/model-interface/shared/types';
import type { ConversationLabel } from '@/lib/calls/model-chat-conversation';

export interface ChatHistoryActions {
    removeChatHistorySession: (id: string) => Promise<boolean>;
    removeChatHistorySessionById?: (id: string) => Promise<boolean>;
    setChatHistory: (sessions: ChatSession[]) => void;
    getChatHistory: () => Promise<ChatSession[]>;
    onStarToggle: (sessionId: string, isStarred: boolean) => Promise<void>;
    onPublish?: (session: ChatSession, isRepublishing?: boolean, existingUrl?: string) => void;
}

export interface ChatHistoryListItemProps {
    session: ChatSession;
    isActive: boolean;
    /** True when the user has typed text without sending (unsent draft). */
    hasDraft?: boolean;
    /** True when this conversation has an in-flight send/stream in the background. */
    isGenerating?: boolean;
    /** Stops the in-flight request for this row (sidebar loader control). */
    onStopGenerating?: () => void;
    models: Model[];
    onSelect: (session: ChatSession) => void;
    onStarRequest: (session: ChatSession) => void;
    onDeleteRequest: (session: ChatSession) => void;
    onPublishRequest?: (session: ChatSession) => void;
    onTranscriptRequest?: (session: ChatSession) => void;
    onAssignLabelsRequest?: (session: ChatSession) => void;
    isStarred: boolean;
    isPublished?: boolean;
    isMobile?: boolean;
    isDeleting?: boolean;
    isStarring?: boolean;
    isPublishing?: boolean;
    /** Global conversation labels for rendering badges/dots */
    conversationLabels?: ConversationLabel[];
    /** Whether sidebar is in 'flat' or 'labels' mode */
    sidebarOrganization?: 'flat' | 'labels';
}
