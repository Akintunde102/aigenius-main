import type { CSSProperties } from "react";

/** Solid chat canvas — no dot grid so message content stays primary. */
export function chatCanvasSurfaceStyle(): CSSProperties {
  return { backgroundColor: "var(--chat-canvas-bg)" };
}
