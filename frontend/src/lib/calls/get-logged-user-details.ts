import { serverCall } from "@/servercall/init";
import { serverCalls } from "@/servercall/store";
import { storageConstants } from "@/lib/constants";
import { storage } from "@/lib/utils/store";
import {
  USER_DETAILS_CACHE_TTL_MS,
  clearUserDetailsCache,
  getMemoryCachedUserDetails,
  getMemoryCachedUserDetailsAt,
  setMemoryCachedUserDetails,
} from "@/lib/calls/user-details-cache";

/**
 * User snapshot from memory or local storage only — **no network**.
 * Use on public routes (e.g. published conversations) where `getUserDetails()` must not
 * trigger auth refresh / `handleSessionExpired()` → login redirect for anonymous visitors
 * or users with a stale token who should still view public content.
 */
export function getStoredUserDetailsSnapshot<T = Record<string, unknown>>(): T | null {
  const mem = getMemoryCachedUserDetails() as T | null;
  if (mem) {
    return mem;
  }
  return storage(storageConstants.LOGGED_USER_DETAILS).getObject<T>() ?? null;
}

let inflightPromise: Promise<any> | null = null;

export const getUserDetails = async (forceRefresh = false) => {
  const now = Date.now();
  const cachedUser = getMemoryCachedUserDetails() as any;
  const cachedAt = getMemoryCachedUserDetailsAt();

  if (cachedUser && now - cachedAt < USER_DETAILS_CACHE_TTL_MS && !forceRefresh) {
    return cachedUser;
  }

  if (!cachedUser && !forceRefresh) {
    const storedUser = storage(storageConstants.LOGGED_USER_DETAILS).getObject<any>();
    if (storedUser) {
      setMemoryCachedUserDetails(storedUser, now);
      return storedUser;
    }
  }

  if (inflightPromise) {
    return inflightPromise;
  }

  inflightPromise = (async () => {
    try {
      const res = await serverCall({
        serverCallProps: {
          call: serverCalls.getGatewayLoggedUserDetails,
        },
        authorized: true,
      });

      const userData = res.dataReturned;

      if (!userData.config) {
        userData.config = {};
      }
      if (userData.config.wallet === null || userData.config.wallet === undefined) {
        userData.config.wallet = 0;
      }

      setMemoryCachedUserDetails(userData, Date.now());
      storage(storageConstants.LOGGED_USER_DETAILS).setObject(userData);
      return userData;
    } finally {
      inflightPromise = null;
    }
  })();

  return inflightPromise;
};

export { clearUserDetailsCache } from "@/lib/calls/user-details-cache";
