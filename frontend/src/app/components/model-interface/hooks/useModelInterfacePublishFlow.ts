import { useCallback } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { publishConversation } from '@/lib/calls/model-chat-conversation';
import type { ChatSession } from '../shared/types';
import type { PublishState } from '../ModelInterface.types';

type SetChatHistory = Dispatch<SetStateAction<ChatSession[]>>;
type SetError = (error: string) => void;

export function useModelInterfacePublishFlow(
  publishState: PublishState,
  setPublishState: React.Dispatch<React.SetStateAction<PublishState>>,
  setChatHistory: SetChatHistory,
  setError: SetError,
) {
  const handlePublishFromSidebar = useCallback(
    (session: ChatSession, isRepublishing = false, existingUrl = '') => {
      setPublishState({
        kind: isRepublishing ? 'republish' : 'new',
        session,
        existingUrl,
      });
    },
    [setPublishState],
  );

  const handlePublishConversation = useCallback(
    async (title: string, description?: string): Promise<string> => {
      try {
        if (publishState.kind === 'closed' || !publishState.session.id) {
          throw new Error('No session selected for publishing');
        }

        const conversationId = await publishConversation(
          publishState.session.id,
          title,
          description,
          {
            id: publishState.session.id,
            title: publishState.session.title,
            modelId: publishState.session.modelId,
            messages: publishState.session.messages,
            starred: publishState.session.starred,
          },
        );

        setChatHistory((prevHistory) =>
          prevHistory.map((session) =>
            session.id === publishState.session.id
              ? {
                  ...session,
                  isPublished: true,
                  publishedAt: new Date().toISOString(),
                  publishedTitle: title,
                  publishedDescription: description,
                }
              : session,
          ),
        );

        return conversationId;
      } catch (err) {
        console.error('Failed to publish conversation:', err);
        setError('Failed to publish conversation. Please try again.');
        throw err;
      }
    },
    [publishState, setChatHistory, setError],
  );

  return { handlePublishFromSidebar, handlePublishConversation };
}
