/** Shared dynamic import for ModelInterface (prefetch + next/dynamic). */

import {
  clearChunkReloadGuard,
  isChunkLoadError,
  tryAutoReloadOnChunkLoadError,
} from "@/lib/utils/chunk-load-recovery";
import { ensureLazyDefault } from "@/lib/utils/lazy-component";

export function importModelInterfaceWithRetry() {
  return import("@/app/components/model-interface/ModelInterface")
    .then((m) => {
      clearChunkReloadGuard();
      return ensureLazyDefault(m.default, "chat");
    })
    .catch((err) => {
      if (typeof window === "undefined" || !isChunkLoadError(err)) {
        throw err;
      }
      if (tryAutoReloadOnChunkLoadError(err)) {
        return new Promise<never>(() => {
          /* Intentionally pending until navigation replaces the document. */
        });
      }
      throw err;
    });
}
