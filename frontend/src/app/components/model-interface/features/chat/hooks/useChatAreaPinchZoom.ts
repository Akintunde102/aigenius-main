import { useCallback, useRef } from "react";
import {
  isAigeniusDesktopRuntime,
  isDesktopShellFromBuild,
} from "@/lib/utils/desktop-runtime";
import {
  bindChatAreaPinchZoom,
  readStoredChatTextScale,
} from "./chatTextScale.utils";

function isDesktopChatZoomHost(): boolean {
  return isAigeniusDesktopRuntime() || isDesktopShellFromBuild();
}

export function useChatAreaPinchZoom(): (element: HTMLElement | null) => void {
  const scaleRef = useRef(readStoredChatTextScale());
  const pinchStartDistanceRef = useRef<number | null>(null);
  const pinchStartScaleRef = useRef(1);
  const gestureStartScaleRef = useRef(1);
  const cleanupRef = useRef<(() => void) | null>(null);
  const isDesktopRef = useRef(isDesktopChatZoomHost());

  return useCallback((element: HTMLElement | null) => {
    cleanupRef.current?.();
    cleanupRef.current = null;

    if (!element) return;

    cleanupRef.current = bindChatAreaPinchZoom(
      element,
      scaleRef,
      pinchStartDistanceRef,
      pinchStartScaleRef,
      gestureStartScaleRef,
      { isDesktop: isDesktopRef.current },
    );
  }, []);
}
