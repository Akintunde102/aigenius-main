import { ChatMessage, Model } from '@/app/components/model-interface/shared/types';
import { ProcessedContent } from './chatOperations.types';
import { migrateAbortControllerKey } from './abortControllerMap.utils';
import { addOrMergeSessionToLocalHistory } from '@/lib/utils/modelChatConversationUtils';
import { setActiveRouteConversationTarget } from '@/app/components/model-interface/conversation/conversationViewSession';
import { deriveChatSessionTitle } from '@/lib/utils/messageTextUtils';
import { notifyDesktopChatCompletionIfBackground } from '@/lib/utils/desktop-chat-completion-notify';
import { notifyBackgroundConversationReady } from '@/lib/utils/background-conversation-notify';
import { contentToDisplayText } from './contentProcessing.utils';
import { getChatProjectScopeId } from '@/lib/code-projects/chat-project-scope';

export interface FinalizeNonStreamingTurnParams {
    result: { conversationId?: string; usage?: any; cost_credits?: number };
    assistantMsg: ChatMessage;
    processedContent: ProcessedContent;
    fullMessages: ChatMessage[];
    modelForRequest: Model;
    requestSessionId: string | null;
    ownsView: boolean;
    sameDraftGeneration: boolean;
    chatMapKey: string;
    uiChatBase?: ChatMessage[];
    clientDraftKeyAtDispatch?: string;
    abortMapKeyAtStart: string;
    abortControllers: Map<string, AbortController>;
    setChatForSession: (key: string, updater: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])) => void;
    updateSessionMessages?: (id: string, messages: ChatMessage[], meta?: any) => void;
    setCurrentSessionId?: (id: string) => void;
    onDraftCompleted?: (id: string, assistantMsg: ChatMessage, draftKey?: string) => void;
    logMetrics: (usage?: any, costCredits?: number) => void;
}

/**
 * Handles the session transition, abort controller migration, local history update,
 * and completion notifications when a non-streaming chat turn finishes.
 *
 * @returns The active abort cleanup key (either the original draft key or the new conversationId).
 */
export function finalizeNonStreamingTurn({
    result,
    assistantMsg,
    processedContent,
    fullMessages,
    modelForRequest,
    requestSessionId,
    ownsView,
    sameDraftGeneration,
    chatMapKey,
    uiChatBase,
    clientDraftKeyAtDispatch,
    abortMapKeyAtStart,
    abortControllers,
    setChatForSession,
    updateSessionMessages,
    setCurrentSessionId,
    onDraftCompleted,
    logMetrics,
}: FinalizeNonStreamingTurnParams): string {
    let abortCleanupKey = abortMapKeyAtStart;

    if (requestSessionId === null && result.conversationId) {
        migrateAbortControllerKey(
            abortControllers,
            abortMapKeyAtStart,
            result.conversationId,
        );
        abortCleanupKey = result.conversationId;
        setActiveRouteConversationTarget(result.conversationId);
        const scopeId = getChatProjectScopeId();

        // Always persist draft completions under the real id so they are visible
        // in history even when the user has already moved to another chat.
        setChatForSession(result.conversationId, fullMessages);
        updateSessionMessages?.(result.conversationId, fullMessages, {
            modelId: modelForRequest.id,
            title: deriveChatSessionTitle(fullMessages[0]?.content),
            codeProjectId: scopeId,
        });
        void addOrMergeSessionToLocalHistory({
            id: result.conversationId,
            codeProjectId: scopeId,
            session: { messages: fullMessages },
        });

        // If the user is still on this draft view, perform UI migration/switch.
        if (ownsView) {
            onDraftCompleted?.(result.conversationId, assistantMsg, clientDraftKeyAtDispatch);
        }
    } else if (requestSessionId !== null || sameDraftGeneration) {
        // Existing session (or background new chat — write to draft slot and
        // leave it). A draft response from an older generation must not write
        // into the freshly opened draft, so that case is skipped entirely.
        if (uiChatBase) {
            setChatForSession(chatMapKey, [...uiChatBase, assistantMsg]);
        } else {
            setChatForSession(chatMapKey, prev => [...prev, assistantMsg]);
        }

        if (requestSessionId && ownsView && result.conversationId && setCurrentSessionId) {
            setCurrentSessionId(result.conversationId);
        }

        if (requestSessionId && updateSessionMessages) {
            updateSessionMessages(requestSessionId, fullMessages, {
                modelId: modelForRequest.id,
                title: deriveChatSessionTitle(fullMessages[0]?.content),
            });
        }

        if (requestSessionId) {
            void addOrMergeSessionToLocalHistory({
                id: requestSessionId,
                codeProjectId: getChatProjectScopeId(),
                session: { messages: undefined },
            });
        }
    }

    void notifyDesktopChatCompletionIfBackground({
        body: contentToDisplayText(processedContent),
        modelName: modelForRequest.name || modelForRequest.id,
    });

    if (!ownsView) {
        void notifyBackgroundConversationReady({
            title: deriveChatSessionTitle(fullMessages[0]?.content) || 'Chat',
        });
    }

    logMetrics(result.usage, result.cost_credits);

    return abortCleanupKey;
}
