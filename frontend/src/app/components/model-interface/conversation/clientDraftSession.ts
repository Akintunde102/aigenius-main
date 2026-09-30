/**
 * Per–New Chat client-only session keys (never sent to the API or used in URLs).
 * Prefixed so they are not treated as server UUID conversation ids.
 */

import { DRAFT_SESSION_KEY } from '../features/chat/hooks/chatOperations.constants';

export const CLIENT_DRAFT_SESSION_PREFIX = 'cd_';

/** Native UUID — fastest standard id on modern browsers. */
export function createClientDraftSessionId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${CLIENT_DRAFT_SESSION_PREFIX}${crypto.randomUUID()}`;
  }
  return `${CLIENT_DRAFT_SESSION_PREFIX}${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

export function isClientDraftSessionId(id: string | null | undefined): boolean {
  return typeof id === 'string' && id.startsWith(CLIENT_DRAFT_SESSION_PREFIX);
}

let activeClientDraftSessionId = createClientDraftSessionId();

export function getClientDraftSessionId(): string {
  return activeClientDraftSessionId;
}

/** Allocate a fresh draft slot (call on each New Chat / draft reset). */
export function renewClientDraftSessionId(): string {
  activeClientDraftSessionId = createClientDraftSessionId();
  return activeClientDraftSessionId;
}

/** Active chatMap key when the main pane is in draft mode (no saved conversation id). */
export function resolveActiveChatMapKey(viewSessionId: string | null): string {
  return viewSessionId ?? getClientDraftSessionId();
}

/** Move legacy `__draft__` storage entries onto the current client draft id. */
export function migrateLegacyDraftStorageKey<T>(
  map: Record<string, T>,
  isEmpty: (value: T) => boolean = () => false,
): Record<string, T> {
  const legacy = map[DRAFT_SESSION_KEY];
  if (legacy === undefined || isEmpty(legacy)) {
    return map;
  }
  const { [DRAFT_SESSION_KEY]: _removed, ...rest } = map;
  return { ...rest, [getClientDraftSessionId()]: legacy };
}

export function clearClientDraftStorageKeys(
  clearKey: (sessionKey: string) => void,
): void {
  clearKey(getClientDraftSessionId());
  clearKey(DRAFT_SESSION_KEY);
}
