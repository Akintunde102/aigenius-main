import { ChatSession, Model } from '@/app/components/model-interface/shared/types';

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
    models: Model[];
    onSelect: (session: ChatSession) => void;
    onStarRequest: (session: ChatSession) => void;
    onDeleteRequest: (session: ChatSession) => void;
    onPublishRequest?: (session: ChatSession) => void;
    isStarred: boolean;
    isPublished?: boolean;
    isMobile?: boolean;
    isDeleting?: boolean;
    isStarring?: boolean;
    isPublishing?: boolean;
}
