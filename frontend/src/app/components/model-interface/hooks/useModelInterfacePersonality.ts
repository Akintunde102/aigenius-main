import { useCallback, useEffect, useRef, useState } from "react";
import { setConversationPersonality } from "@/lib/calls/model-chat-conversation";
import type { Personality as PersonaType } from "@/lib/calls/model-chat-conversation";
import type { ChatMessage, ChatSession } from "../shared/types";
import { DRAFT_SESSION_KEY } from "../features/chat/hooks/chatOperations.constants";

type SetChatForSession = (
  sessionKey: string,
  updater: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[]),
) => void;

type Params = {
  currentSessionId: string | null;
  chatHistory: ChatSession[];
  personalities: PersonaType[];
  setSelectedPersonalityName: (name: string | undefined) => void;
  setSelectedPersonalityIconUrl: (url: string | undefined) => void;
  setChatHistory: React.Dispatch<React.SetStateAction<ChatSession[]>>;
  setChatForSession: SetChatForSession;
};

export function useModelInterfacePersonality({
  currentSessionId,
  chatHistory,
  personalities,
  setSelectedPersonalityName,
  setSelectedPersonalityIconUrl,
  setChatHistory,
  setChatForSession,
}: Params) {
  const [selectedPersonalityId, setSelectedPersonalityId] = useState<
    string | undefined
  >(undefined);
  const [selectedSystemPrompt, setSelectedSystemPrompt] = useState<
    string | undefined
  >(undefined);
  const lastPersistedPersonalityKeyRef = useRef<string | null>(null);

  const applySessionPersonalityState = useCallback(
    (session?: ChatSession | null) => {
      if (!session) {
        setSelectedPersonalityId(undefined);
        setSelectedSystemPrompt(undefined);
        setSelectedPersonalityName(undefined);
        setSelectedPersonalityIconUrl(undefined);
        return;
      }

      const systemMessage = session.messages.find(
        (message) => message.role === "system",
      );
      const matchedPersonality = session.personalityId
        ? personalities.find(
            (personality) => personality.id === session.personalityId,
          )
        : undefined;

      setSelectedPersonalityId(session.personalityId || undefined);
      setSelectedSystemPrompt(
        session.systemPrompt ||
          (typeof systemMessage?.content === "string"
            ? systemMessage.content
            : undefined),
      );
      setSelectedPersonalityName(
        matchedPersonality?.name || systemMessage?.personaName || undefined,
      );
      setSelectedPersonalityIconUrl(
        matchedPersonality?.icon || systemMessage?.personaIconUrl || undefined,
      );
    },
    [personalities, setSelectedPersonalityIconUrl, setSelectedPersonalityName],
  );

  useEffect(() => {
    if (!currentSessionId) {
      lastPersistedPersonalityKeyRef.current = null;
      return;
    }

    const activeSession = chatHistory.find(
      (session) => session.id === currentSessionId,
    );
    if (activeSession) {
      applySessionPersonalityState(activeSession);
    }
  }, [currentSessionId, chatHistory, applySessionPersonalityState]);

  useEffect(() => {
    if (!currentSessionId) {
      return;
    }

    if (!selectedPersonalityId && !selectedSystemPrompt) {
      return;
    }

    const persistenceKey = `${currentSessionId}:${selectedPersonalityId || ""}:${selectedSystemPrompt || ""}`;
    if (lastPersistedPersonalityKeyRef.current === persistenceKey) {
      return;
    }

    let cancelled = false;

    void setConversationPersonality(currentSessionId, {
      personalityId: selectedPersonalityId,
      systemPrompt: selectedSystemPrompt,
    })
      .then(() => {
        if (!cancelled) {
          lastPersistedPersonalityKeyRef.current = persistenceKey;
          setChatHistory((prevHistory) =>
            prevHistory.map((session) =>
              session.id === currentSessionId
                ? {
                    ...session,
                    personalityId: selectedPersonalityId,
                    systemPrompt: selectedSystemPrompt,
                  }
                : session,
            ),
          );
        }
      })
      .catch((error) => {
        console.warn("Failed to persist conversation personality", error);
      });

    return () => {
      cancelled = true;
    };
  }, [
    currentSessionId,
    selectedPersonalityId,
    selectedSystemPrompt,
    setChatHistory,
  ]);

  const clearConversationPersonality = useCallback(async () => {
    setSelectedPersonalityId(undefined);
    setSelectedSystemPrompt(undefined);
    setSelectedPersonalityName(undefined);
    setSelectedPersonalityIconUrl(undefined);

    const sessionKey = currentSessionId ?? DRAFT_SESSION_KEY;
    setChatForSession(sessionKey, (prev) =>
      prev.filter((message) => message.role !== "system"),
    );

    if (currentSessionId) {
      setChatHistory((prevHistory) =>
        prevHistory.map((session) =>
          session.id === currentSessionId
            ? {
                ...session,
                personalityId: undefined,
                systemPrompt: undefined,
              }
            : session,
        ),
      );
    }

    if (!currentSessionId) {
      lastPersistedPersonalityKeyRef.current = null;
      return;
    }

    try {
      await setConversationPersonality(currentSessionId, {
        personalityId: null,
        systemPrompt: null,
      });
      lastPersistedPersonalityKeyRef.current = `${currentSessionId}::`;
    } catch (error) {
      console.warn("Failed to clear conversation personality", error);
    }
  }, [
    currentSessionId,
    setChatForSession,
    setChatHistory,
    setSelectedPersonalityIconUrl,
    setSelectedPersonalityName,
  ]);

  return {
    selectedPersonalityId,
    setSelectedPersonalityId,
    selectedSystemPrompt,
    setSelectedSystemPrompt,
    applySessionPersonalityState,
    clearConversationPersonality,
  };
}
