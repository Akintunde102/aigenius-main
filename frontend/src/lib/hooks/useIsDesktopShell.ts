"use client";

import { useSyncExternalStore } from "react";

/** True when running inside the Electron preload bridge (main shell window). */
export function useIsDesktopShell(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => Boolean(typeof window !== "undefined" && window.aigeniusDesktop?.isDesktop),
    () => false,
  );
}
