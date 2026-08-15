import {
  CHAT_TEXT_SCALE_STORAGE_KEY,
  applyChatTextScale,
  bindChatAreaPinchZoom,
  chatTextScaleToBodySizeRem,
  clampChatTextScale,
  isChatZoomKeyboardAction,
  isChatZoomWheelEvent,
  isPointerOverElement,
  persistChatTextScale,
  readStoredChatTextScale,
  wheelDeltaToScaleFactor,
} from "../chatTextScale.utils";

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

describe("chatTextScale.utils", () => {
  beforeEach(() => {
    installLocalStorageMock();
    window.localStorage.clear();
  });

  it("clamps invalid and out-of-range scales to safe bounds", () => {
    expect(clampChatTextScale(Number.NaN)).toBe(1);
    expect(clampChatTextScale(0.5)).toBe(0.75);
    expect(clampChatTextScale(2)).toBe(1.75);
  });

  it("maps scale to rem-based chat body size", () => {
    expect(chatTextScaleToBodySizeRem(1)).toBe("0.9375rem");
    expect(chatTextScaleToBodySizeRem(1.5)).toBe("1.40625rem");
  });

  it("applies chat text scale CSS variables on an element", () => {
    const element = document.createElement("div");
    const applied = applyChatTextScale(element, 1.2);

    expect(applied).toBe(1.2);
    expect(element.style.getPropertyValue("--chat-body-size")).toBe("1.125rem");
    expect(element.style.zoom).toBe("1.2");
    expect(element.dataset.chatTextScale).toBe("1.2");
  });

  it("reads and persists scale from localStorage", () => {
    window.localStorage.setItem(CHAT_TEXT_SCALE_STORAGE_KEY, "1.4");
    expect(readStoredChatTextScale()).toBe(1.4);

    persistChatTextScale(1.1);
    expect(window.localStorage.getItem(CHAT_TEXT_SCALE_STORAGE_KEY)).toBe("1.1");
  });

  it("detects trackpad pinch and desktop alt-wheel zoom gestures", () => {
    expect(
      isChatZoomWheelEvent(
        new WheelEvent("wheel", { ctrlKey: true }),
      ),
    ).toBe(true);
    expect(
      isChatZoomWheelEvent(
        new WheelEvent("wheel", { altKey: true }),
        true,
      ),
    ).toBe(true);
    expect(
      isChatZoomWheelEvent(
        new WheelEvent("wheel", { altKey: true }),
        false,
      ),
    ).toBe(false);
  });

  it("maps keyboard shortcuts to zoom actions", () => {
    expect(
      isChatZoomKeyboardAction(
        new KeyboardEvent("keydown", { ctrlKey: true, key: "=" }),
      ),
    ).toBe("in");
    expect(
      isChatZoomKeyboardAction(
        new KeyboardEvent("keydown", { ctrlKey: true, key: "-" }),
      ),
    ).toBe("out");
    expect(
      isChatZoomKeyboardAction(
        new KeyboardEvent("keydown", { ctrlKey: true, key: "0" }),
      ),
    ).toBe("reset");
  });

  it("zooms via window-level ctrl+wheel when pointer is over chat area", () => {
    const element = document.createElement("div");
    document.body.appendChild(element);
    Object.defineProperty(element, "getBoundingClientRect", {
      configurable: true,
      value: () => ({
        left: 0,
        top: 0,
        right: 200,
        bottom: 200,
        width: 200,
        height: 200,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }),
    });

    const scaleRef = { current: 1 };
    const cleanup = bindChatAreaPinchZoom(
      element,
      scaleRef,
      { current: null },
      { current: 1 },
      { current: 1 },
      { isDesktop: true },
    );

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

    expect(Number.parseFloat(element.dataset.chatTextScale ?? "1")).toBeGreaterThan(1);
    cleanup();
    element.remove();
  });

  it("computes a stable wheel scale factor", () => {
    expect(wheelDeltaToScaleFactor(-100)).toBeGreaterThan(1);
    expect(wheelDeltaToScaleFactor(100)).toBeLessThan(1);
  });

  it("checks pointer position against element bounds", () => {
    const element = document.createElement("div");
    Object.defineProperty(element, "getBoundingClientRect", {
      configurable: true,
      value: () => ({
        left: 10,
        top: 10,
        right: 110,
        bottom: 110,
        width: 100,
        height: 100,
        x: 10,
        y: 10,
        toJSON: () => ({}),
      }),
    });

    expect(isPointerOverElement(50, 50, element)).toBe(true);
    expect(isPointerOverElement(0, 0, element)).toBe(false);
  });
});
