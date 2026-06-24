import React from "react";
import { render, screen } from "@testing-library/react";
import { ChatAreaVirtualizedList } from "../ChatAreaVirtualizedList";
import { ChatMessage } from "@/app/components/model-interface/shared/types";

// Mock child component
jest.mock("../../../messages/components/ChatMessageWrapper", () => ({
  ChatMessageWrapper: ({ msg, idx }: { msg: any; idx: number }) => (
    <div data-testid="chat-message-wrapper" data-idx={idx}>
      {msg.content}
    </div>
  ),
}));

// Mock copy-to-clipboard
jest.mock("copy-to-clipboard", () => jest.fn());

describe("ChatAreaVirtualizedList", () => {
  const mockProps = {
    chat: [] as ChatMessage[],
    selectedModel: null,
    models: [],
    showCosts: false,
    showNaira: false,
    loading: false,
    imagePreview: null,
    setImagePreview: jest.fn(),
    chatAreaRef: { current: null },
    onDeleteMessage: jest.fn(),
    onSaveMessage: jest.fn(),
    onReplayMessage: jest.fn(),
  };

  it("renders all messages when below the limit", () => {
    const chat: ChatMessage[] = [
      { role: "user", content: "Hello 1", timestamp: 1 },
      { role: "assistant", content: "Reply 1", timestamp: 2 },
    ];

    render(<ChatAreaVirtualizedList {...mockProps} chat={chat} />);

    const messages = screen.getAllByTestId("chat-message-wrapper");
    expect(messages).toHaveLength(2);
    expect(screen.queryByText(/Performance Note/i)).not.toBeInTheDocument();
  });

  it("filters out system messages from the count and display", () => {
    const chat: ChatMessage[] = [
      { role: "system", content: "System prompt", timestamp: 0 },
      { role: "user", content: "Hello 1", timestamp: 1 },
    ];

    render(<ChatAreaVirtualizedList {...mockProps} chat={chat} />);

    const messages = screen.getAllByTestId("chat-message-wrapper");
    expect(messages).toHaveLength(1);
    expect(messages[0]).toHaveTextContent("Hello 1");
  });

  it("caps the display to the last 150 non-system messages", () => {
    // Total 160 user messages
    const chat: ChatMessage[] = Array.from({ length: 160 }, (_, i) => ({
      role: "user",
      content: `Message ${i}`,
      timestamp: i,
    }));

    render(<ChatAreaVirtualizedList {...mockProps} chat={chat} />);

    const messages = screen.getAllByTestId("chat-message-wrapper");
    expect(messages).toHaveLength(150);
    
    // Should show the LAST 150 (from 10 to 159)
    expect(messages[0]).toHaveTextContent("Message 10");
    expect(messages[149]).toHaveTextContent("Message 159");

    // Performance note should be visible
    expect(screen.getByText(/Performance Note: Only the last 150 messages/i)).toBeInTheDocument();
  });

  it("correctly maps actualIdx even when capped", () => {
    const chat: ChatMessage[] = Array.from({ length: 160 }, (_, i) => ({
      role: "user",
      content: `Message ${i}`,
      timestamp: i,
    }));

    render(<ChatAreaVirtualizedList {...mockProps} chat={chat} />);

    const messages = screen.getAllByTestId("chat-message-wrapper");
    
    // First displayed message is at index 10 in the original array
    expect(messages[0].getAttribute("data-idx")).toBe("10");
  });
});
