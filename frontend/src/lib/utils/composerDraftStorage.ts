/**
 * Persists per-conversation composer drafts (WhatsApp-style) across reloads and
 * remounts. Keys match useChatOperationsRefined inputMap: conversation ids
 * or DRAFT_SESSION_KEY for the home/new-chat draft.
 */

export const COMPOSER_DRAFT_STORAGE_KEY = "aigenius-composer-drafts-v1";

const DRAFT_PERSIST_DEBOUNCE_MS = 300;

function sanitizeMap(map: Record<string, string>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(map).filter(
      ([, v]) => typeof v === "string" && v.trim() !== "",
    ),
  );
}

export function loadComposerDraftMap(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = sessionStorage.getItem(COMPOSER_DRAFT_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      return {};
    }
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (typeof k === "string" && typeof v === "string" && v.trim() !== "") {
        out[k] = v;
      }
    }
    return out;
  } catch {
    return {};
  }
}

export function persistComposerDraftMap(map: Record<string, string>): void {
  if (typeof window === "undefined") return;
  try {
    const cleaned = sanitizeMap(map);
    if (Object.keys(cleaned).length === 0) {
      sessionStorage.removeItem(COMPOSER_DRAFT_STORAGE_KEY);
    } else {
      sessionStorage.setItem(COMPOSER_DRAFT_STORAGE_KEY, JSON.stringify(cleaned));
    }
  } catch (e) {
    console.warn("composerDraftStorage: persist failed", e);
  }
}

export function createDebouncedDraftPersist(
  delayMs: number = DRAFT_PERSIST_DEBOUNCE_MS,
): (map: Record<string, string>) => void {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return (map: Record<string, string>) => {
    if (timer !== null) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      persistComposerDraftMap(map);
    }, delayMs);
  };
}

export const COMPOSER_FILES_STORAGE_KEY = "aigenius-composer-files-v1";

export interface StoredUploadedFile {
  fileUrl: string;
  isImage: boolean;
  displayName: string;
  mimeType?: string;
  source: "local" | "library";
  libraryFileId?: string;
}

export function loadComposerFilesMap(): Record<string, StoredUploadedFile[]> {
  if (typeof window === "undefined") return {};
  try {
    const raw = sessionStorage.getItem(COMPOSER_FILES_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      return {};
    }
    return parsed as Record<string, StoredUploadedFile[]>;
  } catch {
    return {};
  }
}

export function persistComposerFilesMap(map: Record<string, StoredUploadedFile[]>): void {
  if (typeof window === "undefined") return;
  try {
    const cleaned = Object.fromEntries(
      Object.entries(map).filter(([, v]) => Array.isArray(v) && v.length > 0)
    );
    if (Object.keys(cleaned).length === 0) {
      sessionStorage.removeItem(COMPOSER_FILES_STORAGE_KEY);
    } else {
      sessionStorage.setItem(COMPOSER_FILES_STORAGE_KEY, JSON.stringify(cleaned));
    }
  } catch (e) {
    console.warn("composerDraftStorage: persist files failed", e);
  }
}
