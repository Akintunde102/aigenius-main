import type { ChatSession } from "./shared/types";

export type PublishState =
  | { kind: "closed" }
  | { kind: "new"; session: ChatSession; existingUrl: string }
  | { kind: "republish"; session: ChatSession; existingUrl: string };

export interface ModelInterfaceProps {
  routeConversationId?: string | null;
}

/** Parses `/chat/:id` from the pathname (client-only). */
export function getConversationIdFromPath(pathname: string): string | null {
  const match = pathname.match(/^\/chat\/([^/]+)$/);
  return match?.[1] ?? null;
}
