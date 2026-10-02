"use client";

import { createContext, useContext, useRef, type ReactNode, type RefObject } from "react";
import { CursorFollower } from "./CursorFollower";

/**
 * The page scrolls inside this fixed container, not the window, so every scroll-linked effect
 * (parallax, pinned story, header state) must be told which element to watch.
 */
const ScrollContainerContext = createContext<RefObject<HTMLDivElement> | null>(null);

export function useLandingScroll() {
  return useContext(ScrollContainerContext);
}

interface LandingShellProps {
  className: string;
  children: ReactNode;
}

export function LandingShell({ className, children }: LandingShellProps) {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <ScrollContainerContext.Provider value={ref}>
      <div ref={ref} className={className}>
        {children}
        <CursorFollower />
      </div>
    </ScrollContainerContext.Provider>
  );
}
