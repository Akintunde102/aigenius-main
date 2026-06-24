import { storageConstants } from "@/lib/constants";
import { storage } from "@/lib/utils/store";

let cachedUser: unknown = null;
let cachedAt = 0;

export const USER_DETAILS_CACHE_TTL_MS = 60_000;

export function getMemoryCachedUserDetails(): unknown {
  return cachedUser;
}

export function getMemoryCachedUserDetailsAt(): number {
  return cachedAt;
}

export function setMemoryCachedUserDetails(user: unknown, at: number): void {
  cachedUser = user;
  cachedAt = at;
}

/**
 * Clears in-memory + persisted user snapshot (no servercall).
 * Used after server-reported wallet changes and by getUserDetails.
 */
export function clearUserDetailsCache(): void {
  cachedUser = null;
  cachedAt = 0;
  storage(storageConstants.LOGGED_USER_DETAILS).removeItem();
}
