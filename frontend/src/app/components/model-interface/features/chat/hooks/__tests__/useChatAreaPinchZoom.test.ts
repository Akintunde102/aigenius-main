import React, { useRef } from "react";
import { act } from "@testing-library/react";
import { createRoot, Root } from "react-dom/client";
import { useChatAreaPinchZoom } from "../useChatAreaPinchZoom";
import { CHAT_TEXT_SCALE_STORAGE_KEY } from "../chatTextScale.utils";

function PinchZoomHarness() {
  const chatAreaRef = useRef<HTMLDivElement>(null);
  const bindPinchZoom = useChatAreaPinchZoom();
  return React.createElement("div", {
    ref: (node: HTMLDivElement | null) => {
      chatAreaRef.current = node;
      bindPinchZoom(node);
    },
    "data-testid": "chat-area",
  });
}

function installLocalStorageMock() {
  const store = new Map<string, string>();
  window.localStorage.getItem = jest.fn((key: string) => store.get(key) ?? null);
  window.localStorage.setItem = jest.fn((key: string, value: string) => {
    store.set(key, value);
  });
  window.localStorage.removeItem = jest.fn((key: string) => {
    store.delete(key);
  });
  window.localStorage.clear = jest.fn(() => {
    store.clear();
  });
}

describe("useChatAreaPinchZoom", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    installLocalStorageMock();
    window.localStorage.clear();
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => {
      root.render(React.createElement(PinchZoomHarness));
    });
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it("restores stored scale on mount", () => {
    act(() => {
      root.unmount();
    });
    window.localStorage.setItem(CHAT_TEXT_SCALE_STORAGE_KEY, "1.3");
    root = createRoot(container);
    act(() => {
      root.render(React.createElement(PinchZoomHarness));
    });

    const chatArea = container.querySelector('[data-testid="chat-area"]') as HTMLElement;
    expect(chatArea.style.getPropertyValue("--chat-body-size")).toBe("1.21875rem");
    expect(chatArea.style.zoom).toBe("1.3");
  });

  it("zooms in when ctrl+wheel is used over the chat area", () => {
    const chatArea = container.querySelector('[data-testid="chat-area"]') as HTMLElement;
    Object.defineProperty(chatArea, "getBoundingClientRect", {
      configurable: true,
      value: () => ({
        left: 0,
        top: 0,
        right: 400,
        bottom: 400,
        width: 400,
        height: 400,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }),
    });

    act(() => {
      window.dispatchEvent(
        new WheelEvent("wheel", {
          bubbles: true,
          cancelable: true,
          clientX: 50,
          clientY: 50,
          deltaY: -100,
          ctrlKey: true,
        }),
      );
    });

    expect(Number.parseFloat(chatArea.dataset.chatTextScale ?? "1")).toBeGreaterThan(1);
    expect(window.localStorage.getItem(CHAT_TEXT_SCALE_STORAGE_KEY)).not.toBeNull();
  });

  it("ignores plain wheel scroll without ctrl/meta", () => {
    const chatArea = container.querySelector('[data-testid="chat-area"]') as HTMLElement;

    act(() => {
      window.dispatchEvent(
        new WheelEvent("wheel", {
          bubbles: true,
          cancelable: true,
          deltaY: -100,
        }),
      );
    });

    expect(chatArea.dataset.chatTextScale).toBe("1");
  });

  it("scales text when a two-finger pinch gesture moves", () => {
    const chatArea = container.querySelector('[data-testid="chat-area"]') as HTMLElement;

    act(() => {
      chatArea.dispatchEvent(
        new TouchEvent("touchstart", {
          bubbles: true,
          cancelable: true,
          touches: [
            { clientX: 0, clientY: 0 } as Touch,
            { clientX: 100, clientY: 0 } as Touch,
          ],
        }),
      );
      chatArea.dispatchEvent(
        new TouchEvent("touchmove", {
          bubbles: true,
          cancelable: true,
          touches: [
            { clientX: 0, clientY: 0 } as Touch,
            { clientX: 200, clientY: 0 } as Touch,
          ],
        }),
      );
    });

    expect(Number.parseFloat(chatArea.dataset.chatTextScale ?? "1")).toBeGreaterThan(1);
  });
});
