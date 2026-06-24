import { useEffect, type RefObject } from "react";
import { getUserDetails } from "@/lib/calls/get-logged-user-details";
import { filesFromDesktopChatScreenshotPayloads } from "@/lib/utils/desktop-chat-screenshot";
import type { ChatContainerHandle } from "../features/chat/components/ChatContainer";

type RequestModelPick = () => Promise<{ id: string; name?: string } | null>;

type Params = {
  isDesktopShell: boolean;
  supportsImageUpload: boolean;
  isMobile: boolean;
  chatLength: number;
  lastChatRole?: string;
  setCurrentUser: (value: Record<string, unknown> | null) => void;
  setError: (value: string) => void;
  handleGlobalKeyDown: (event: KeyboardEvent) => void;
  requestModelPick: RequestModelPick;
  handleQueuedFiles: (files: File[]) => void;
  chatContainerRef: RefObject<ChatContainerHandle | null>;
};

export function useModelInterfaceLifecycle({
  isDesktopShell,
  supportsImageUpload,
  isMobile,
  chatLength,
  lastChatRole,
  setCurrentUser,
  setError,
  handleGlobalKeyDown,
  requestModelPick,
  handleQueuedFiles,
  chatContainerRef,
}: Params) {
  useEffect(() => {
    if (!isDesktopShell || !supportsImageUpload) return;
    if (typeof window === "undefined") return;

    const subscribe = window.aigeniusDesktop?.onQueueChatScreenshot;
    if (!subscribe) return;

    return subscribe((items) => {
      try {
        handleQueuedFiles(filesFromDesktopChatScreenshotPayloads(items));
        queueMicrotask(() => chatContainerRef.current?.focusInput());
      } catch (error) {
        console.error("[ModelInterface] Failed to queue desktop screenshot", error);
        setError("Failed to add desktop screenshot to chat.");
      }
    });
  }, [
    chatContainerRef,
    handleQueuedFiles,
    isDesktopShell,
    setError,
    supportsImageUpload,
  ]);

  useEffect(() => {
    if (chatLength === 0 || lastChatRole !== "assistant" || isMobile) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      chatContainerRef.current?.focusInput();
    }, 100);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [chatContainerRef, chatLength, isMobile, lastChatRole]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    let disposed = false;
    const onRequestModelPick = () => {
      void (async () => {
        try {
          const picked = await requestModelPick();
          if (!picked || disposed) {
            return;
          }
          window.dispatchEvent(
            new CustomEvent("model-picked", {
              detail: { modelId: picked.id, modelName: picked.name },
            }),
          );
        } catch (error) {
          if (!disposed) {
            console.error("[ModelInterface] Model selection request failed", error);
            setError("Model selection failed. Please try again.");
          }
        }
      })();
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    window.addEventListener("request-model-pick", onRequestModelPick as EventListener);

    return () => {
      disposed = true;
      window.removeEventListener("keydown", handleGlobalKeyDown);
      window.removeEventListener(
        "request-model-pick",
        onRequestModelPick as EventListener,
      );
    };
  }, [handleGlobalKeyDown, requestModelPick, setError]);

  useEffect(() => {
    let cancelled = false;

    void getUserDetails()
      .then((user) => {
        if (!cancelled) {
          setCurrentUser(user ?? null);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          console.error("[ModelInterface] Failed to load user details", error);
          setCurrentUser(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [setCurrentUser]);
}
