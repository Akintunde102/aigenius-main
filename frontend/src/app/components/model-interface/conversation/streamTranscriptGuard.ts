/**
 * Invariant I4 — visible transcript updates only when the in-flight request
 * belongs to the conversation currently open in the main pane.
 *
 * See docs/MULTI_CHAT_ARCHITECTURE_ROADMAP.md (I4, T3).
 *
 * Always pass the **latest** open-session id (e.g. from a ref), not a value
 * captured when the stream started, when deciding whether to call `setChat`.
 */
export function shouldApplyStreamToOpenTranscript(
  streamSessionId: string | null | undefined,
  openViewSessionId: string | null | undefined,
): boolean {
  const a = streamSessionId ?? null;
  const b = openViewSessionId ?? null;
  return a === b;
}
