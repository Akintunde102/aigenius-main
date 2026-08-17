export const CHAT_BODY_BASE_REM = 0.9375;
export const CHAT_TEXT_SCALE_MIN = 0.75;
export const CHAT_TEXT_SCALE_MAX = 1.75;
export const CHAT_TEXT_SCALE_STORAGE_KEY = "aigenius:chat-text-scale";

export type ChatZoomBindOptions = {
  isDesktop?: boolean;
};

export function clampChatTextScale(scale: number): number {
  if (!Number.isFinite(scale)) return 1;
  return Math.min(CHAT_TEXT_SCALE_MAX, Math.max(CHAT_TEXT_SCALE_MIN, scale));
}

export function chatTextScaleToBodySizeRem(scale: number): string {
  return `${CHAT_BODY_BASE_REM * clampChatTextScale(scale)}rem`;
}

export function applyChatTextScale(element: HTMLElement, scale: number): number {
  const clamped = clampChatTextScale(scale);
  element.style.setProperty(
    "--chat-body-size",
    chatTextScaleToBodySizeRem(clamped),
  );
  const style = element.style as CSSStyleDeclaration & { zoom: string };
  style.zoom = String(clamped);
  element.dataset.chatTextScale = String(clamped);
  return clamped;
}

export function readStoredChatTextScale(): number {
  if (typeof window === "undefined") return 1;
  try {
    const raw = window.localStorage.getItem(CHAT_TEXT_SCALE_STORAGE_KEY);
    if (raw == null) return 1;
    return clampChatTextScale(Number.parseFloat(raw));
  } catch {
    return 1;
  }
}

export function persistChatTextScale(scale: number): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      CHAT_TEXT_SCALE_STORAGE_KEY,
      String(clampChatTextScale(scale)),
    );
  } catch {
    // Ignore quota / private mode errors.
  }
}

export function wheelDeltaToScaleFactor(deltaY: number): number {
  const clampedDelta = Math.max(-10, Math.min(10, deltaY));
  return Math.pow(2, -clampedDelta * 0.01);
}

export function isChatZoomWheelEvent(
  event: WheelEvent,
  isDesktop = false,
): boolean {
  if (event.ctrlKey || event.metaKey) return true;
  if (!isDesktop) return false;
  return event.altKey && !event.shiftKey;
}

export function isChatZoomKeyboardAction(
  event: KeyboardEvent,
): "in" | "out" | "reset" | null {
  if (!(event.ctrlKey || event.metaKey) || event.altKey) return null;
  if (event.key === "=" || event.key === "+" || event.code === "Equal") {
    return "in";
  }
  if (event.key === "-" || event.key === "_" || event.code === "Minus") {
    return "out";
  }
  if (event.key === "0" || event.code === "Digit0" || event.code === "Numpad0") {
    return "reset";
  }
  return null;
}

export function isPointerOverElement(
  clientX: number,
  clientY: number,
  element: HTMLElement,
): boolean {
  const rect = element.getBoundingClientRect();
  return (
    clientX >= rect.left &&
    clientX <= rect.right &&
    clientY >= rect.top &&
    clientY <= rect.bottom
  );
}

function isWheelOverChatArea(event: WheelEvent, element: HTMLElement): boolean {
  const target = event.target;
  if (target instanceof Node && element.contains(target)) {
    return true;
  }
  return isPointerOverElement(event.clientX, event.clientY, element);
}

function isKeyboardTargetInChatArea(
  element: HTMLElement,
  pointer: { x: number; y: number },
): boolean {
  const active = document.activeElement;
  if (active instanceof Node && element.contains(active)) {
    return true;
  }
  return isPointerOverElement(pointer.x, pointer.y, element);
}

export function bindChatAreaPinchZoom(
  element: HTMLElement,
  scaleRef: { current: number },
  pinchStartDistanceRef: { current: number | null },
  pinchStartScaleRef: { current: number },
  gestureStartScaleRef: { current: number },
  options: ChatZoomBindOptions = {},
): () => void {
  const isDesktop = options.isDesktop === true;
  const pointerRef = { x: 0, y: 0 };

  scaleRef.current = applyChatTextScale(element, scaleRef.current);

  const setScale = (nextScale: number) => {
    scaleRef.current = applyChatTextScale(element, nextScale);
  };

  const finishPinch = () => {
    if (pinchStartDistanceRef.current == null) return;
    pinchStartDistanceRef.current = null;
    persistChatTextScale(scaleRef.current);
  };

  const applyWheelZoom = (event: WheelEvent) => {
    if (!isChatZoomWheelEvent(event, isDesktop)) return;
    if (!isWheelOverChatArea(event, element)) return;
    if (event.cancelable) event.preventDefault();
    setScale(scaleRef.current * wheelDeltaToScaleFactor(event.deltaY));
    persistChatTextScale(scaleRef.current);
  };

  const getTouchDistance = (touches: TouchList): number => {
    if (touches.length < 2) return 0;
    const first = touches[0];
    const second = touches[1];
    if (!first || !second) return 0;
    return Math.hypot(
      first.clientX - second.clientX,
      first.clientY - second.clientY,
    );
  };

  const onTouchStart = (event: TouchEvent) => {
    if (event.touches.length !== 2) return;
    pinchStartDistanceRef.current = getTouchDistance(event.touches);
    pinchStartScaleRef.current = scaleRef.current;
  };

  const onTouchMove = (event: TouchEvent) => {
    const startDistance = pinchStartDistanceRef.current;
    if (event.touches.length !== 2 || startDistance == null || startDistance <= 0) {
      return;
    }
    if (event.cancelable) event.preventDefault();
    const distance = getTouchDistance(event.touches);
    setScale(pinchStartScaleRef.current * (distance / startDistance));
  };

  const onTouchEnd = (event: TouchEvent) => {
    if (event.touches.length >= 2) return;
    finishPinch();
  };

  const supportsGestureEvents = "ongesturestart" in element;

  const onGestureStart = (event: Event) => {
    if (event.cancelable) event.preventDefault();
    gestureStartScaleRef.current = scaleRef.current;
    pinchStartDistanceRef.current = 1;
  };

  const onGestureChange = (event: Event) => {
    if (pinchStartDistanceRef.current == null) return;
    if (event.cancelable) event.preventDefault();
    const gestureScale = (event as Event & { scale?: number }).scale ?? 1;
    setScale(gestureStartScaleRef.current * gestureScale);
  };

  const onGestureEnd = (event: Event) => {
    if (event.cancelable) event.preventDefault();
    finishPinch();
  };

  const onPointerMove = (event: PointerEvent) => {
    pointerRef.x = event.clientX;
    pointerRef.y = event.clientY;
  };

  const onKeyDown = (event: KeyboardEvent) => {
    const action = isChatZoomKeyboardAction(event);
    if (!action) return;
    if (!isKeyboardTargetInChatArea(element, pointerRef)) return;
    event.preventDefault();
    if (action === "in") {
      setScale(scaleRef.current * 1.1);
    } else if (action === "out") {
      setScale(scaleRef.current / 1.1);
    } else {
      setScale(1);
    }
    persistChatTextScale(scaleRef.current);
  };

  const touchOptions = { capture: true } as const;
  const passiveFalse = { capture: true, passive: false } as const;
  const windowWheelOptions = { capture: true, passive: false } as const;

  window.addEventListener("wheel", applyWheelZoom, windowWheelOptions);
  window.addEventListener("pointermove", onPointerMove, { passive: true });
  window.addEventListener("keydown", onKeyDown, true);

  element.addEventListener("touchstart", onTouchStart, touchOptions);
  element.addEventListener("touchmove", onTouchMove, passiveFalse);
  element.addEventListener("touchend", onTouchEnd, touchOptions);
  element.addEventListener("touchcancel", onTouchEnd, touchOptions);

  if (supportsGestureEvents) {
    element.addEventListener("gesturestart", onGestureStart, passiveFalse);
    element.addEventListener("gesturechange", onGestureChange, passiveFalse);
    element.addEventListener("gestureend", onGestureEnd, passiveFalse);
  }

  return () => {
    window.removeEventListener("wheel", applyWheelZoom, windowWheelOptions);
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("keydown", onKeyDown, true);

    element.removeEventListener("touchstart", onTouchStart, touchOptions);
    element.removeEventListener("touchmove", onTouchMove, passiveFalse);
    element.removeEventListener("touchend", onTouchEnd, touchOptions);
    element.removeEventListener("touchcancel", onTouchEnd, touchOptions);

    if (supportsGestureEvents) {
      element.removeEventListener("gesturestart", onGestureStart, passiveFalse);
      element.removeEventListener("gesturechange", onGestureChange, passiveFalse);
      element.removeEventListener("gestureend", onGestureEnd, passiveFalse);
    }
  };
}
