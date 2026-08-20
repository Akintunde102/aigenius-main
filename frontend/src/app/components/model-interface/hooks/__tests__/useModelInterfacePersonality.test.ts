import { renderHook, act, waitFor } from "@testing-library/react";
import { useModelInterfacePersonality } from "../useModelInterfacePersonality";
import { setConversationPersonality } from "@/lib/calls/model-chat-conversation";
import type { ChatSession } from "../../shared/types";

jest.mock("@/lib/calls/model-chat-conversation", () => ({
  setConversationPersonality: jest.fn(() => Promise.resolve({})),
}));

const setConversationPersonalityMock =
  setConversationPersonality as jest.MockedFunction<
    typeof setConversationPersonality
  >;

describe("useModelInterfacePersonality", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("clears personality on the current conversation instead of starting a new chat", async () => {
    const setSelectedPersonalityName = jest.fn();
    const setSelectedPersonalityIconUrl = jest.fn();
    const setChatHistory = jest.fn();
    const setChatForSession = jest.fn();

    const chatHistory: ChatSession[] = [
      {
        id: "session-1",
        title: "Persona chat",
        modelId: "gpt-4o",
        personalityId: "persona-1",
        systemPrompt: "Be helpful",
        messages: [],
      },
    ];

    const { result } = renderHook(() =>
      useModelInterfacePersonality({
        currentSessionId: "session-1",
        chatHistory,
        personalities: [
          {
            id: "persona-1",
            name: "Coach",
            prompt: "Be helpful",
            modelId: "gpt-4o",
            icon: "",
            userId: "user-1",
            createdAt: "",
            updatedAt: "",
          },
        ],
        setSelectedPersonalityName,
        setSelectedPersonalityIconUrl,
        setChatHistory,
        setChatForSession,
      }),
    );

    await act(async () => {
      await result.current.clearConversationPersonality();
    });

    expect(setChatForSession).toHaveBeenCalledWith(
      "session-1",
      expect.any(Function),
    );
    expect(setConversationPersonalityMock).toHaveBeenCalledWith("session-1", {
      personalityId: null,
      systemPrompt: null,
    });
    expect(setSelectedPersonalityName).toHaveBeenCalledWith(undefined);
    expect(setSelectedPersonalityIconUrl).toHaveBeenCalledWith(undefined);
    expect(setChatHistory).toHaveBeenCalled();
  });

  it("removes the system message locally for draft chats without persisting", async () => {
    const setChatForSession = jest.fn();

    const { result } = renderHook(() =>
      useModelInterfacePersonality({
        currentSessionId: null,
        chatHistory: [],
        personalities: [],
        setSelectedPersonalityName: jest.fn(),
        setSelectedPersonalityIconUrl: jest.fn(),
        setChatHistory: jest.fn(),
        setChatForSession,
      }),
    );

    await act(async () => {
      await result.current.clearConversationPersonality();
    });

    expect(setChatForSession).toHaveBeenCalledWith(
      "__draft__",
      expect.any(Function),
    );
    await waitFor(() => {
      expect(setConversationPersonalityMock).not.toHaveBeenCalled();
    });
  });
});
