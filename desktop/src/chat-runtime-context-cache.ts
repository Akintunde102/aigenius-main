import type { getChatRuntimeContextForIpc } from './chat-runtime-context';

type ChatRuntimeContext = Awaited<ReturnType<typeof getChatRuntimeContextForIpc>>;

let cached: ChatRuntimeContext | null = null;
let cachedAt = 0;

const TTL_MS = 2_000;

export async function getChatRuntimeContextCached(
  loader: () => Promise<ChatRuntimeContext>,
): Promise<ChatRuntimeContext> {
  const now = Date.now();
  if (cached && now - cachedAt < TTL_MS) {
    return cached;
  }
  const fresh = await loader();
  cached = fresh;
  cachedAt = now;
  return fresh;
}

export function invalidateChatRuntimeContextCache(): void {
  cached = null;
  cachedAt = 0;
}
