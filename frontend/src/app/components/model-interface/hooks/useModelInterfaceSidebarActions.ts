import { useCallback } from "react";
import {
  removeChatHistorySession,
  removeChatHistorySessionById,
  toggleChatSessionStarred,
} from "@/lib/utils/modelChatConversationUtils";
import type { ChatSession, Model } from "../shared/types";

type RemoveStrategy = "session" | "conversation";

type Params = {
  currentSessionId: string | null;
  models: Model[];
  setError: (message: string) => void;
  setChatHistory: React.Dispatch<React.SetStateAction<ChatSession[]>>;
  createNewSessionAndSwitchWrapper: (modelId: string) => Promise<void> | void;
  refreshWalletFromBackend?: (() => Promise<unknown>) | null;
  refreshWalletBalance: () => Promise<unknown>;
};

export function useModelInterfaceSidebarActions({
  currentSessionId,
  models,
  setError,
  setChatHistory,
  createNewSessionAndSwitchWrapper,
  refreshWalletFromBackend,
  refreshWalletBalance,
}: Params) {
  const removeFromHistory = useCallback(
    async (id: string, strategy: RemoveStrategy): Promise<boolean> => {
      const removeAction =
        strategy === "session"
          ? removeChatHistorySession
          : removeChatHistorySessionById;

      try {
        const result = await removeAction(id);

        if (!result) {
          return false;
        }

        const wasActiveSession = id === currentSessionId;
        setChatHistory((prevHistory) =>
          prevHistory.filter((session) => session.id !== id),
        );

        if (wasActiveSession) {
          await createNewSessionAndSwitchWrapper(models[0]?.id || "default");
        }

        return true;
      } catch (error) {
        console.error("[ModelInterface] Failed to remove history item", error);
        setError("Failed to remove conversation");
        return false;
      }
    },
    [
      createNewSessionAndSwitchWrapper,
      currentSessionId,
      models,
      setChatHistory,
      setError,
    ],
  );

  const handleRemoveChatHistorySession = useCallback(
    (id: string) => removeFromHistory(id, "session"),
    [removeFromHistory],
  );

  const handleRemoveChatHistorySessionById = useCallback(
    (id: string) => removeFromHistory(id, "conversation"),
    [removeFromHistory],
  );

  const handleStarToggle = useCallback(
    async (sessionId: string, isStarred: boolean) => {
      try {
        await toggleChatSessionStarred(sessionId);
        setChatHistory((prevHistory) =>
          prevHistory.map((session) =>
            session.id === sessionId
              ? { ...session, starred: isStarred }
              : session,
          ),
        );
      } catch (error) {
        console.error("[ModelInterface] Failed to toggle starred status", error);
        setError("Failed to update starred status");
      }
    },
    [setChatHistory, setError],
  );

  const handleWalletUpdateFromSidebar = useCallback(async () => {
    if (refreshWalletFromBackend) {
      await refreshWalletFromBackend();
      return;
    }
    await refreshWalletBalance();
  }, [refreshWalletFromBackend, refreshWalletBalance]);

  return {
    handleStarToggle,
    handleRemoveChatHistorySession,
    handleRemoveChatHistorySessionById,
    handleWalletUpdateFromSidebar,
  };
}
