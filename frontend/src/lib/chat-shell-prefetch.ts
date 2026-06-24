/**
 * Warms the chat app JS chunk and Next route payload before navigation to `/chat/*`.
 * The sidebar lives inside the same dynamic chunk as ModelInterface — there is no
 * separate "sidebar bundle"; toggling the drawer after load does not fetch new JS.
 *
 * Draft segment must stay in sync with `DRAFT_SESSION_KEY` in chatOperations.constants.
 */
const CHAT_DRAFT_SEGMENT = "__draft__";

type AppRouterLike = { prefetch: (href: string) => void };

function runWhenIdle(fn: () => void): void {
  if (typeof window === "undefined") return;
  const ric = window.requestIdleCallback;
  if (typeof ric === "function") {
    ric(fn, { timeout: 4000 });
  } else {
    window.setTimeout(fn, 1);
  }
}

let modelInterfaceImportStarted = false;

/**
 * Fire-and-forget: prefetch draft chat route and the ModelInterface client chunk.
 * Idempotent per tab session for the dynamic import.
 */
export function scheduleChatShellPrefetch(router: AppRouterLike): void {
  runWhenIdle(() => {
    try {
      router.prefetch(`/chat/${CHAT_DRAFT_SEGMENT}`);
    } catch {
      /* noop */
    }
    if (modelInterfaceImportStarted) return;
    modelInterfaceImportStarted = true;
    void import("@/app/components/model-interface/ModelInterface");
  });
}
