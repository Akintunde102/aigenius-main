/** Bottom edge of the visible menu area (above the sticky chat composer when present). */
export function getMessageActionsMenuViewportBottom(): number {
  const inputContainer = document.querySelector<HTMLElement>(".chat-input-container");
  if (!inputContainer) {
    return window.innerHeight;
  }
  return inputContainer.getBoundingClientRect().top;
}

export function resolveMessageActionsMenuVerticalDirection(
  triggerRect: DOMRectReadOnly,
  menuHeight: number,
  viewportBottom: number,
  viewportMargin = 8,
): "up" | "down" {
  const spaceAbove = triggerRect.top - viewportMargin;
  const spaceBelow = viewportBottom - triggerRect.bottom - viewportMargin;
  const canOpenUp = spaceAbove >= menuHeight;
  const canOpenDown = spaceBelow >= menuHeight;

  if (canOpenDown && !canOpenUp) {
    return "down";
  }

  if (canOpenUp && !canOpenDown) {
    return "up";
  }

  if (!canOpenUp && !canOpenDown) {
    return spaceBelow > spaceAbove ? "down" : "up";
  }

  return "down";
}
