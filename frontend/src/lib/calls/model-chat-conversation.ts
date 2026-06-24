import { serverCall } from "@/servercall/init";
import { serverCalls } from "@/servercall/store";
import {
    ChatMessage,
    ChatSession,
    OrphanReplyAnchor,
} from "@/app/components/model-interface/shared/types";
import { normalizeChatMessages, normalizeSessionMessages } from '@/lib/utils/messageContentUtils';

type ConversationType = 'saved_chat' | 'full_session' | 'chat_history' | 'pinned_chat' | 'published_chat';

export interface ConversationMetadata {
    totalCost?: number;
    totalTokens?: number;
    lastAccessed?: string | Date;
    orphanAnchor?: OrphanReplyAnchor;
}

/** Mirrors gateway `ModelChatConversation` row for client-side use. */
export interface ModelChatConversation {
    id: string;
    userId: string;
    type: ConversationType;
    conversationKind?: 'default' | 'orphan_question';
    parentConversationId?: string | null;
    parentMessageId?: string | null;
    session: {
        title: string;
        modelId: string;
        messages: ChatMessage[];
    };
    isPinned?: boolean;
    starred?: boolean;
    metadata?: ConversationMetadata;
    personalityId?: string;
    systemPrompt?: string;
    isPublished?: boolean;
    publishedAt?: string;
    publishedTitle?: string;
    publishedDescription?: string;
    createdAt: string;
    updatedAt: string;
}

export interface UsageInfo {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
    tool_cost_usd?: number;
}

export interface CostCalculation {
    usage: UsageInfo;
    cost: number;
    costBreakdown: {
        promptCost: number;
        completionCost: number;
    };
    modelPricing: Record<string, string>;
}

/** Shape returned by `GET model-chats/stats` (matches backend `ChatStats`). */
export interface UserChatStats {
    totalConversations: number;
    totalCost: number;
    totalTokens: number;
    pinnedCount: number;
}

export type AllChatResourcesPayload = {
    savedChats: ChatMessage[];
    savedFullChats: ChatSession[];
    chatHistory: ChatSession[];
    pinnedChats: ChatSession[];
};

let getAllChatResourcesInflight: Promise<AllChatResourcesPayload> | null = null;

function buildSavedSnippetConversationRow(item: ChatMessage): {
    type: 'saved_chat';
    session: ChatSession;
    metadata: ConversationMetadata;
} {
    return {
        type: 'saved_chat',
        session: {
            title: `Saved Message - ${new Date().toLocaleString()}`,
            modelId: item.modelId || 'unknown',
            messages: [item],
        },
        metadata: {
            totalCost: item.cost || 0,
            totalTokens: item.usage?.total_tokens || 0,
            lastAccessed: new Date(),
        },
    };
}

function normalizeAggregatedResourcesPayload(raw: unknown): AllChatResourcesPayload {
    const d = raw as {
        savedChats?: ChatMessage[];
        savedFullChats?: ChatSession[];
        chatHistory?: ChatSession[];
        pinnedChats?: ChatSession[];
    } | null | undefined;

    return {
        savedChats:
            d != null && Array.isArray(d.savedChats)
                ? (normalizeChatMessages(d.savedChats) as ChatMessage[])
                : [],
        savedFullChats:
            d != null && Array.isArray(d.savedFullChats)
                ? d.savedFullChats.map(normalizeSessionMessages)
                : [],
        chatHistory:
            d != null && Array.isArray(d.chatHistory) ? d.chatHistory.map(normalizeSessionMessages) : [],
        pinnedChats:
            d != null && Array.isArray(d.pinnedChats) ? d.pinnedChats.map(normalizeSessionMessages) : [],
    };
}

function normalizeConversationSessionPayload(
    conv: Omit<ModelChatConversation, 'session'> & { session: ModelChatConversation['session'] | string },
): ModelChatConversation | null {
    let session = conv.session;
    if (typeof session === 'string') {
        try {
            session = JSON.parse(session) as ModelChatConversation['session'];
        } catch {
            return conv as unknown as ModelChatConversation;
        }
    }
    if (!session || typeof session !== 'object' || !Array.isArray((session as { messages?: unknown }).messages)) {
        return conv as unknown as ModelChatConversation;
    }

    return {
        ...conv,
        session: {
            ...session,
            messages: normalizeChatMessages(session.messages) as ChatMessage[],
        },
    };
}

export const saveChatItem = async (item: ChatMessage) => {
    const response = await serverCall({
        serverCallProps: {
            call: serverCalls.postGatewayModelChatsSaveChatItem,
            data: { item: buildSavedSnippetConversationRow(item) },
        },
        authorized: true,
    });
    return response.dataReturned;
};

export const getSavedChatItems = async (): Promise<ChatMessage[]> => {
    const response = await serverCall({
        serverCallProps: {
            call: serverCalls.getGatewayModelChatsSavedChatItems,
        },
        authorized: true,
    });
    const items = response.dataReturned as ChatMessage[] | undefined;
    return Array.isArray(items) ? (normalizeChatMessages(items) as ChatMessage[]) : [];
};

export const removeSavedChatItem = async (id: string): Promise<boolean> => {
    const response = await serverCall({
        serverCallProps: {
            call: serverCalls.deleteGatewayModelChatsSavedChatItem,
        },
        pathArgs: { id },
        authorized: true,
    });
    return response.dataReturned;
};

export const removeSavedChatItemById = async (id: string): Promise<boolean> => {
    if (!id) throw new Error('Cannot delete chat: id is undefined');
    const response = await serverCall({
        serverCallProps: {
            call: serverCalls.deleteGatewayModelChatsSavedChatItemById,
        },
        pathArgs: { id },
        authorized: true,
    });
    return response.dataReturned;
};

export const getSavedFullChatSessions = async (): Promise<ChatSession[]> => {
    const response = await serverCall({
        serverCallProps: {
            call: serverCalls.getGatewayModelChatsSavedFullSessions,
        },
        authorized: true,
    });
    const sessions = response.dataReturned as ChatSession[] | undefined;
    return Array.isArray(sessions) ? sessions.map(normalizeSessionMessages) : [];
};

export const removeSavedFullChatSession = async (id: string): Promise<boolean> => {
    const response = await serverCall({
        serverCallProps: {
            call: serverCalls.deleteGatewayModelChatsSavedFullSession,
        },
        pathArgs: { id },
        authorized: true,
    });
    return response.dataReturned;
};

export const addOrUpdateChatHistory = async (
    session: ChatMessage[],
    modelId: string,
    modelName: string,
): Promise<ModelChatConversation> => {
    const response = await serverCall({
        serverCallProps: {
            call: serverCalls.postGatewayModelChatsAddOrUpdateHistory,
            data: { session, modelId, modelName },
        },
        authorized: true,
    });
    return response.dataReturned;
};

export const getChatHistory = async (): Promise<ChatSession[]> => {
    const response = await serverCall({
        serverCallProps: {
            call: serverCalls.getGatewayModelChatsChatHistory,
        },
        authorized: true,
    });
    const sessions = response.dataReturned as ChatSession[] | undefined;
    return Array.isArray(sessions) ? sessions.map(normalizeSessionMessages) : [];
};

export const removeChatHistorySessionById = async (id: string): Promise<boolean> => {
    if (!id) throw new Error('Cannot delete chat history: id is undefined');
    const response = await serverCall({
        serverCallProps: {
            call: serverCalls.deleteGatewayModelChatsChatHistorySessionById,
        },
        pathArgs: { id },
        authorized: true,
    });
    return response.dataReturned;
};

export const getPinnedChats = async (): Promise<ChatSession[]> => {
    const response = await serverCall({
        serverCallProps: {
            call: serverCalls.getGatewayModelChatsPinnedChats,
        },
        authorized: true,
    });
    const sessions = response.dataReturned as ChatSession[] | undefined;
    return Array.isArray(sessions) ? sessions.map(normalizeSessionMessages) : [];
};

export const getAllChatResources = async (): Promise<AllChatResourcesPayload> => {
    if (getAllChatResourcesInflight) {
        return getAllChatResourcesInflight;
    }

    const request = serverCall({
        serverCallProps: {
            call: serverCalls.getGatewayModelChatsResources,
        },
        authorized: true,
    })
        .then((r) => normalizeAggregatedResourcesPayload(r.dataReturned))
        .finally(() => {
            getAllChatResourcesInflight = null;
        });

    getAllChatResourcesInflight = request;
    return request;
};

export const getConversationById = async (conversationId: string): Promise<ModelChatConversation | null> => {
    try {
        const response = await serverCall({
            serverCallProps: {
                call: serverCalls.getGatewayModelChatsConversationById,
            },
            pathArgs: { id: conversationId },
            authorized: true,
        });
        const conv = response.dataReturned as
            | (Omit<ModelChatConversation, 'session'> & { session: ModelChatConversation['session'] | string })
            | null;
        if (!conv) return null;
        return normalizeConversationSessionPayload(conv);
    } catch (error) {
        console.error('Failed to get conversation by ID:', error);
        return null;
    }
};

export const getOrphanThreadsForConversation = async (conversationId: string): Promise<ModelChatConversation[]> => {
    const response = await serverCall({
        serverCallProps: {
            call: serverCalls.getGatewayModelChatsConversationOrphans,
        },
        pathArgs: { id: conversationId },
        authorized: true,
    });

    const rows = Array.isArray(response.dataReturned) ? response.dataReturned : [];
    return rows
        .map((row: unknown) => normalizeConversationSessionPayload(row as ModelChatConversation))
        .filter(Boolean) as ModelChatConversation[];
};

export const getOrphanThreadsForMessage = async (
    conversationId: string,
    messageId: string,
): Promise<ModelChatConversation[]> => {
    const response = await serverCall({
        serverCallProps: {
            call: serverCalls.getGatewayModelChatsConversationMessageOrphans,
        },
        pathArgs: { id: conversationId, messageId },
        authorized: true,
    });

    const rows = Array.isArray(response.dataReturned) ? response.dataReturned : [];
    return rows
        .map((row: unknown) => normalizeConversationSessionPayload(row as ModelChatConversation))
        .filter(Boolean) as ModelChatConversation[];
};

export const pinChatSession = async (session: ChatSession) => {
    const response = await serverCall({
        serverCallProps: {
            call: serverCalls.postGatewayModelChatsPinChatSession,
            data: {
                session: {
                    ...session,
                    messages: session.messages,
                },
            },
        },
        authorized: true,
    });
    return response.dataReturned;
};

export const unpinChatSession = async (session: ChatSession): Promise<boolean> => {
    const response = await serverCall({
        serverCallProps: {
            call: serverCalls.deleteGatewayModelChatsUnpinChatSession,
            data: {
                session: {
                    ...session,
                    messages: session.messages,
                },
            },
        },
        authorized: true,
    });
    return response.dataReturned;
};

export const toggleChatSessionStarred = async (sessionId: string): Promise<ChatSession> => {
    const response = await serverCall({
        serverCallProps: {
            call: serverCalls.postGatewayModelChatsToggleStarred,
            data: { sessionId },
        },
        authorized: true,
    });
    return response.dataReturned;
};

export const migrateFromLocalStorage = async (localStorageData: {
    savedChats?: ChatMessage[];
    savedFullChats?: ChatSession[];
    chatHistory?: ChatSession[];
    pinnedChats?: ChatSession[];
}) => {
    const response = await serverCall({
        serverCallProps: {
            call: serverCalls.postGatewayModelChatsMigrateFromLocalStorage,
            data: localStorageData,
        },
        authorized: true,
    });
    return response.dataReturned;
};

export const getUserChatStats = async (): Promise<UserChatStats> => {
    const response = await serverCall({
        serverCallProps: {
            call: serverCalls.getGatewayModelChatsStats,
        },
        authorized: true,
    });
    return response.dataReturned;
};

export type Personality = {
    id: string;
    userId: string;
    name: string;
    description?: string;
    prompt: string;
    icon?: string;
    modelId?: string;
    createdAt?: string;
    updatedAt?: string;
    creator?: {
        id: string;
        firstName: string;
        lastName?: string;
        email: string;
        profileImage?: string;
    };
};

export const upsertPersonality = async (payload: {
    id?: string;
    name: string;
    description?: string;
    prompt: string;
    icon?: string;
    modelId?: string;
}): Promise<Personality> => {
    const response = await serverCall({
        serverCallProps: {
            call: serverCalls.postGatewayModelChatsUpsertPersonality,
            data: payload,
        },
        authorized: true,
    });
    return response.dataReturned;
};

export const listPersonalities = async (): Promise<Personality[]> => {
    const response = await serverCall({
        serverCallProps: {
            call: serverCalls.getGatewayModelChatsListPersonalities,
        },
        authorized: true,
    });
    return response.dataReturned;
};

export const deletePersonality = async (id: string): Promise<boolean> => {
    const response = await serverCall({
        serverCallProps: {
            call: serverCalls.deleteGatewayModelChatsDeletePersonality,
        },
        pathArgs: { id },
        authorized: true,
    });
    return response.dataReturned;
};

export const setConversationPersonality = async (
    conversationId: string,
    payload: { personalityId?: string; systemPrompt?: string },
) => {
    const response = await serverCall({
        serverCallProps: {
            call: serverCalls.postGatewayModelChatsSetConversationPersonality,
            data: payload,
        },
        pathArgs: { id: conversationId },
        authorized: true,
    });
    return response.dataReturned;
};

export interface PublishedConversation {
    id: string;
    userId: string;
    type: string;
    session: {
        title: string;
        modelId: string;
        messages: ChatMessage[];
    };
    isPublished: boolean;
    publishedAt: string;
    publishedTitle: string;
    publishedDescription?: string;
    createdAt: string;
    updatedAt: string;
    user?: {
        id: string;
        firstName: string;
        lastName?: string;
        email: string;
    };
}

export const publishConversation = async (
    conversationId: string,
    title: string,
    description?: string,
    session?: ChatSession,
): Promise<string> => {
    const response = await serverCall({
        serverCallProps: {
            call: serverCalls.postGatewayModelChatsPublishConversation,
            data: { conversationId, title, description, session },
        },
        authorized: true,
    });
    return response.dataReturned;
};

export const unpublishConversation = async (conversationId: string): Promise<boolean> => {
    const response = await serverCall({
        serverCallProps: {
            call: serverCalls.postGatewayModelChatsUnpublishConversation,
            data: { conversationId },
        },
        authorized: true,
    });
    return response.dataReturned;
};

export const getPublishedConversations = async (): Promise<PublishedConversation[]> => {
    const response = await serverCall({
        serverCallProps: {
            call: serverCalls.getGatewayModelChatsPublishedConversations,
        },
        authorized: true,
    });
    return response.dataReturned;
};

export const getAllPublishedConversations = async (): Promise<PublishedConversation[]> => {
    const response = await serverCall({
        serverCallProps: {
            call: serverCalls.getAllGatewayModelChatsPublishedConversations,
        },
        authorized: false,
    });
    return response.dataReturned;
};

export const getPublishedConversation = async (conversationId: string): Promise<PublishedConversation | null> => {
    const response = await serverCall({
        serverCallProps: {
            call: serverCalls.getGatewayModelChatsPublishedConversation,
        },
        pathArgs: { id: conversationId },
        authorized: false,
    });
    return response.dataReturned ?? null;
};

export const deletePublishedConversation = async (conversationId: string): Promise<boolean> => {
    const response = await serverCall({
        serverCallProps: {
            call: serverCalls.deleteGatewayModelChatsPublishedConversation,
        },
        pathArgs: { id: conversationId },
        authorized: true,
    });
    return response.dataReturned;
};
