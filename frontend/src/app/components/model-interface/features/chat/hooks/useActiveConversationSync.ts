import { useEffect } from 'react';
import { useConversationQuery } from '@/lib/hooks/useConversationQuery';
import { normalizeSessionMessages } from '@/lib/utils/messageContentUtils';
import { shouldAcceptRemoteConversationSync } from '@/lib/utils/conversationScrollMemory';
import { upsertSessionMessagesInHistory } from '@/app/components/model-interface/conversation/sessionMessagesMap';
import type { ChatMessage, ChatSession } from '@/app/components/model-interface/shared/types';
import type { ChatUpdater } from './useChatData';

type Params = {
  conversationId: string | null;
  chat: ChatMessage[];
  setChatForSession: (sessionId: string, updater: ChatUpdater, options?: { passive?: boolean }) => void;
  setChatHistory: React.Dispatch<React.SetStateAction<ChatSession[]>>;
  isSyncBlocked: boolean;
};

/**
 * Polls the open conversation from the server and merges remote changes into the
 * live transcript when this tab is not actively sending/streaming.
 */
export function useActiveConversationSync({
  conversationId,
  chat,
  setChatForSession,
  setChatHistory,
  isSyncBlocked,
}: Params) {
  const { data: remoteConversation } = useConversationQuery(conversationId, {
    enabled: !!conversationId,
  });

  useEffect(() => {
    if (!conversationId || isSyncBlocked || !remoteConversation?.session?.messages) {
      return;
    }

    const normalized = normalizeSessionMessages({
      id: remoteConversation.id,
      title: remoteConversation.session.title,
      modelId: remoteConversation.session.modelId,
      messages: remoteConversation.session.messages,
      metadata: remoteConversation.metadata,
      personalityId: remoteConversation.personalityId,
      systemPrompt: remoteConversation.systemPrompt,
      starred: remoteConversation.starred,
      isPublished: remoteConversation.isPublished,
      publishedAt: remoteConversation.publishedAt,
      publishedTitle: remoteConversation.publishedTitle,
      publishedDescription: remoteConversation.publishedDescription,
    }) as ChatSession;

    const serverMessages = (normalized.messages || []) as ChatMessage[];
    if (!shouldAcceptRemoteConversationSync(chat, serverMessages)) {
      return;
    }

    setChatForSession(conversationId, serverMessages, { passive: true });
    setChatHistory((prev) =>
      upsertSessionMessagesInHistory(prev, conversationId, serverMessages, normalized),
    );
  }, [
    chat,
    conversationId,
    isSyncBlocked,
    remoteConversation,
    setChatForSession,
    setChatHistory,
  ]);
}
