import fs from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';

const FILE_NAME = 'retrieval-memory-v1.json';
const MAX_ENTRIES = 48;
const MAX_SLUG_LEN = 64;
const MAX_NAME_LEN = 200;
const MAX_DESCRIPTION_LEN = 500;
const MAX_TAGS = 24;
const MAX_TAG_LEN = 48;
const MAX_BODY_CHARS = 200_000;

export type RetrievalMemoryEntry = {
  slug: string;
  name: string;
  description: string;
  tags: string[];
  body: string;
  updatedAtIso: string;
};

type StoreFileV1 = {
  version: 1;
  entries: RetrievalMemoryEntry[];
};

function slugPatternOk(s: string): boolean {
  return /^[a-z0-9][a-z0-9-]{0,63}$/i.test(s) && s.length <= MAX_SLUG_LEN;
}

function normalizeTags(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw
      .filter((t): t is string => typeof t === 'string')
      .map((t) => t.trim().slice(0, MAX_TAG_LEN))
      .filter(Boolean)
      .slice(0, MAX_TAGS);
  }
  if (typeof raw === 'string') {
    return raw
      .split(/[,;]/)
      .map((t) => t.trim().slice(0, MAX_TAG_LEN))
      .filter(Boolean)
      .slice(0, MAX_TAGS);
  }
  return [];
}

type PromptCatalogRow = {
  slug: string;
  name: string;
  description: string;
  tags: string[];
};

export class LocalRetrievalMemoryService {
  private readonly filePath: string;

  /** In-memory snapshot for IPC; avoids sync disk reads on every `get-chat-runtime-context`. */
  private promptCatalogHydrated = false;

  private promptCatalogCache: PromptCatalogRow[] = [];

  constructor(userDataDir: string) {
    this.filePath = path.join(userDataDir, FILE_NAME);
  }

  private mapCatalogRowsFromStore(store: StoreFileV1): PromptCatalogRow[] {
    return store.entries.slice(0, MAX_ENTRIES).map((e) => ({
      slug: e.slug,
      name: typeof e.name === 'string' ? e.name : '',
      description: typeof e.description === 'string' ? e.description : '',
      tags: Array.isArray(e.tags) ? e.tags.filter((t): t is string => typeof t === 'string') : [],
    }));
  }

  /**
   * Loads once from disk (async). Call from `getChatRuntimeContextForIpc` so the first IPC
   * does not rely on a sync read in `getCatalogEntriesForPrompt`.
   */
  async ensurePromptCatalogHydrated(): Promise<void> {
    if (this.promptCatalogHydrated) {
      return;
    }
    const store = await this.readStore();
    this.promptCatalogCache = this.mapCatalogRowsFromStore(store);
    this.promptCatalogHydrated = true;
  }

  private async readStore(): Promise<StoreFileV1> {
    try {
      const raw = await fs.readFile(this.filePath, 'utf8');
      const parsed = JSON.parse(raw) as StoreFileV1;
      if (parsed?.version === 1 && Array.isArray(parsed.entries)) {
        return {
          version: 1,
          entries: parsed.entries
            .filter((e) => e && typeof e.slug === 'string' && slugPatternOk(e.slug))
            .map((e) => ({
              slug: e.slug.trim().slice(0, MAX_SLUG_LEN),
              name: typeof e.name === 'string' ? e.name.trim().slice(0, MAX_NAME_LEN) : '',
              description:
                typeof e.description === 'string' ? e.description.trim().slice(0, MAX_DESCRIPTION_LEN) : '',
              tags: Array.isArray(e.tags)
                ? e.tags.filter((t): t is string => typeof t === 'string').map((t) => t.slice(0, MAX_TAG_LEN)).slice(0, MAX_TAGS)
                : [],
              body: typeof e.body === 'string' ? e.body.slice(0, MAX_BODY_CHARS) : '',
              updatedAtIso: typeof e.updatedAtIso === 'string' ? e.updatedAtIso : new Date().toISOString(),
            })),
        };
      }
    } catch {
      /* missing or corrupt */
    }
    return { version: 1, entries: [] };
  }

  private async writeStore(store: StoreFileV1): Promise<void> {
    const trimmed = {
      version: 1 as const,
      entries: store.entries.slice(0, MAX_ENTRIES),
    };
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    await fs.writeFile(this.filePath, JSON.stringify(trimmed, null, 2), 'utf8');
  }

  /** Public fields only (for system prompt catalog). Requires prior hydrate or upsert on this process. */
  getCatalogEntriesForPrompt(): PromptCatalogRow[] {
    if (!this.promptCatalogHydrated) {
      return [];
    }
    return this.promptCatalogCache.map((r) => ({ ...r, tags: [...r.tags] }));
  }

  async getBySlug(slug: string): Promise<RetrievalMemoryEntry | null> {
    const s = typeof slug === 'string' ? slug.trim().slice(0, MAX_SLUG_LEN) : '';
    if (!slugPatternOk(s)) {
      return null;
    }
    const store = await this.readStore();
    return store.entries.find((e) => e.slug.toLowerCase() === s.toLowerCase()) ?? null;
  }

  async upsert(args: {
    slug: string;
    name?: string;
    description?: string;
    tags?: unknown;
    body: string;
  }): Promise<{ ok: true; slug: string } | { ok: false; error: string }> {
    const slug = typeof args.slug === 'string' ? args.slug.trim().slice(0, MAX_SLUG_LEN) : '';
    if (!slugPatternOk(slug)) {
      return { ok: false, error: `Invalid slug (use letters, numbers, hyphens; max ${MAX_SLUG_LEN} chars).` };
    }
    const body = typeof args.body === 'string' ? args.body.slice(0, MAX_BODY_CHARS) : '';
    if (!body.trim()) {
      return { ok: false, error: 'body is required and cannot be empty.' };
    }
    const name = typeof args.name === 'string' ? args.name.trim().slice(0, MAX_NAME_LEN) : '';
    const description =
      typeof args.description === 'string' ? args.description.trim().slice(0, MAX_DESCRIPTION_LEN) : '';
    const tags = normalizeTags(args.tags);

    const store = await this.readStore();
    const now = new Date().toISOString();
    const idx = store.entries.findIndex((e) => e.slug.toLowerCase() === slug.toLowerCase());
    const row: RetrievalMemoryEntry = {
      slug,
      name: name || slug,
      description,
      tags,
      body,
      updatedAtIso: now,
    };
    if (idx >= 0) {
      store.entries[idx] = row;
    } else {
      if (store.entries.length >= MAX_ENTRIES) {
        return { ok: false, error: `Maximum ${MAX_ENTRIES} retrieval memory entries reached; delete or update an existing slug.` };
      }
      store.entries.push(row);
    }
    await this.writeStore(store);
    this.promptCatalogCache = this.mapCatalogRowsFromStore(store);
    this.promptCatalogHydrated = true;
    return { ok: true, slug };
  }
}

let retrievalSingleton: LocalRetrievalMemoryService | null = null;

export function initLocalRetrievalMemory(userDataDir: string): void {
  retrievalSingleton = new LocalRetrievalMemoryService(userDataDir);
  void retrievalSingleton.ensurePromptCatalogHydrated();
}

export function getRetrievalMemoryService(): LocalRetrievalMemoryService {
  if (!retrievalSingleton) {
    throw new Error('LocalRetrievalMemoryService not initialized');
  }
  return retrievalSingleton;
}

/** When slug omitted, generates a uuid-based slug. */
export async function upsertRetrievalMemoryFromTool(raw: Record<string, unknown>): Promise<
  { ok: true; result: string } | { ok: false; error: string }
> {
  let slug = typeof raw.slug === 'string' ? raw.slug.trim() : '';
  if (!slug) {
    slug = `mem-${randomUUID().slice(0, 8)}`;
  }
  const out = await getRetrievalMemoryService().upsert({
    slug,
    name: typeof raw.name === 'string' ? raw.name : undefined,
    description: typeof raw.description === 'string' ? raw.description : undefined,
    tags: raw.tags,
    body: typeof raw.body === 'string' ? raw.body : '',
  });
  if (!out.ok) {
    return { ok: false, error: out.error };
  }
  return { ok: true, result: JSON.stringify({ ok: true, slug: out.slug }) };
}

export async function getRetrievalMemoryBySlugFromTool(raw: Record<string, unknown>): Promise<
  { ok: true; result: string } | { ok: false; error: string }
> {
  const slug = typeof raw.slug === 'string' ? raw.slug.trim() : '';
  if (!slug) {
    return { ok: false, error: 'slug is required.' };
  }
  const entry = await getRetrievalMemoryService().getBySlug(slug);
  if (!entry) {
    return { ok: true, result: JSON.stringify({ found: false, slug }) };
  }
  return {
    ok: true,
    result: JSON.stringify({
      found: true,
      slug: entry.slug,
      name: entry.name,
      description: entry.description,
      tags: entry.tags,
      updatedAtIso: entry.updatedAtIso,
      body: entry.body,
    }),
  };
}
