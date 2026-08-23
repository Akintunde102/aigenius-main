/**
 * Whether a conversation slot has an active send/stream in this tab.
 * Keys match chatMap / loadingMap / streamingMap (session id or draft key).
 */
export function isSessionInFlight(
  sessionId: string,
  loadingMap: Record<string, boolean>,
  streamingMap: Record<string, boolean>,
): boolean {
  return Boolean(loadingMap[sessionId] || streamingMap[sessionId]);
}

/** All session ids with an in-flight request (for sidebar badges / list pinning). */
export function collectInFlightSessionIds(
  loadingMap: Record<string, boolean>,
  streamingMap: Record<string, boolean>,
): string[] {
  const ids = new Set<string>();
  for (const [sessionId, active] of Object.entries(loadingMap)) {
    if (active) ids.add(sessionId);
  }
  for (const [sessionId, active] of Object.entries(streamingMap)) {
    if (active) ids.add(sessionId);
  }
  return Array.from(ids);
}
