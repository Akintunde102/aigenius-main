import {
  getMessageActionsMenuViewportBottom,
  resolveMessageActionsMenuVerticalDirection,
} from "../messageActionsMenu.collision";

describe("resolveMessageActionsMenuVerticalDirection", () => {
  const triggerNearBottom = { top: 700, bottom: 720, left: 0, right: 0, width: 0, height: 20, x: 0, y: 700, toJSON: () => ({}) };
  const triggerHigh = { top: 120, bottom: 140, left: 0, right: 0, width: 0, height: 20, x: 0, y: 120, toJSON: () => ({}) };
  const menuHeight = 160;
  const composerTop = 740;

  it("opens upward when the composer leaves insufficient space below", () => {
    expect(
      resolveMessageActionsMenuVerticalDirection(triggerNearBottom, menuHeight, composerTop),
    ).toBe("up");
  });

  it("opens downward when there is room below the trigger before the composer", () => {
    expect(
      resolveMessageActionsMenuVerticalDirection(triggerHigh, menuHeight, composerTop),
    ).toBe("down");
  });

  it("falls back to upward when neither side fully fits but above has more room", () => {
    const crampedTrigger = { top: 710, bottom: 730, left: 0, right: 0, width: 0, height: 20, x: 0, y: 710, toJSON: () => ({}) };
    expect(
      resolveMessageActionsMenuVerticalDirection(crampedTrigger, 400, composerTop),
    ).toBe("up");
  });
});

describe("getMessageActionsMenuViewportBottom", () => {
  it("uses the chat composer top when present", () => {
    const input = document.createElement("div");
    input.className = "chat-input-container";
    document.body.appendChild(input);
    input.getBoundingClientRect = () =>
      ({ top: 640, bottom: 800, left: 0, right: 0, width: 0, height: 160, x: 0, y: 640, toJSON: () => ({}) }) as DOMRect;

    expect(getMessageActionsMenuViewportBottom()).toBe(640);

    document.body.removeChild(input);
  });
});
