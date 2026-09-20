import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
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

  it("filters out server-injected runtime_context user messages", () => {
    const chat: ChatMessage[] = [
      {
        role: "user",
        content: "<runtime_context reported_at=\"2026-08-15T14:17:19.324Z\">\nsurface: desktop\n</runtime_context>",
        timestamp: 0,
      },
      { role: "user", content: "Hello", timestamp: 1 },
      { role: "assistant", content: "Hi", timestamp: 2 },
    ];

    render(<ChatAreaVirtualizedList {...mockProps} chat={chat} />);

    const messages = screen.getAllByTestId("chat-message-wrapper");
    expect(messages).toHaveLength(2);
    expect(messages[0]).toHaveTextContent("Hello");
    expect(messages[1]).toHaveTextContent("Hi");
  });

  it("caps the display to the last 50 non-system messages", () => {
    // Total 160 user messages
    const chat: ChatMessage[] = Array.from({ length: 160 }, (_, i) => ({
      role: "user",
      content: `Message ${i}`,
      timestamp: i,
    }));

    render(<ChatAreaVirtualizedList {...mockProps} chat={chat} />);

    const messages = screen.getAllByTestId("chat-message-wrapper");
    expect(messages).toHaveLength(50);

    // Should show the LAST 50 (from 110 to 159)
    expect(messages[0]).toHaveTextContent("Message 110");
    expect(messages[49]).toHaveTextContent("Message 159");

    expect(screen.getByRole("button", { name: /Load older messages \(110 earlier\)/i })).toBeInTheDocument();
  });

  it("loads 50 more older messages when the load-older button is clicked", () => {
    const chat: ChatMessage[] = Array.from({ length: 160 }, (_, i) => ({
      role: "user",
      content: `Message ${i}`,
      timestamp: i,
    }));

    render(<ChatAreaVirtualizedList {...mockProps} chat={chat} />);

    fireEvent.click(screen.getByRole("button", { name: /Load older messages/i }));

    const messages = screen.getAllByTestId("chat-message-wrapper");
    expect(messages).toHaveLength(100);
    expect(messages[0]).toHaveTextContent("Message 60");
    expect(messages[99]).toHaveTextContent("Message 159");
    expect(screen.getByRole("button", { name: /Load older messages \(60 earlier\)/i })).toBeInTheDocument();
  });

  it("correctly maps actualIdx even when capped", () => {
    const chat: ChatMessage[] = Array.from({ length: 160 }, (_, i) => ({
      role: "user",
      content: `Message ${i}`,
      timestamp: i,
    }));

    render(<ChatAreaVirtualizedList {...mockProps} chat={chat} />);

    const messages = screen.getAllByTestId("chat-message-wrapper");

    // First displayed message is at index 110 in the original array
    expect(messages[0].getAttribute("data-idx")).toBe("110");
  });
});
