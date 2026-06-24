import type {
  ChatMessage,
  OrphanReplyAnchor,
  StickyThreadMarker,
} from "@/app/components/model-interface/shared/types";

const STICKY_THREAD_DRAFTS_STORAGE_KEY = "aigenius.sticky-thread-drafts.v1";
const SAME_VIEWPORT_WIDTH_TOLERANCE = 80;
const SAME_VIEWPORT_HEIGHT_TOLERANCE = 120;

type CaretMatch = {
  node: Text;
  offset: number;
};

type StoredDraftMarkersByConversation = Record<string, StickyThreadMarker[]>;

type ResolvedDotPosition = {
  left: number;
  top: number;
};

function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) {
    return min;
  }

  return Math.min(Math.max(value, min), max);
}

function getMessageExcerpt(message: ChatMessage): string | undefined {
  if (typeof message.content === "string") {
    const trimmed = message.content.trim();
    return trimmed ? trimmed.slice(0, 240) : undefined;
  }

  if (!Array.isArray(message.content)) {
    return undefined;
  }

  const text = message.content
    .map((block) => (block.type === "text" ? (block.text ?? "") : ""))
    .join(" ")
    .trim();

  return text ? text.slice(0, 240) : undefined;
}

function getCaretMatchFromPoint(clientX: number, clientY: number): CaretMatch | null {
  if (typeof document === "undefined") {
    return null;
  }

  const docWithCaretPosition = document as Document & {
    caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null;
    caretRangeFromPoint?: (x: number, y: number) => Range | null;
  };

  const position = docWithCaretPosition.caretPositionFromPoint?.(clientX, clientY);
  if (position?.offsetNode?.nodeType === Node.TEXT_NODE) {
    return {
      node: position.offsetNode as Text,
      offset: position.offset,
    };
  }

  const range = docWithCaretPosition.caretRangeFromPoint?.(clientX, clientY);
  if (range?.startContainer?.nodeType === Node.TEXT_NODE) {
    return {
      node: range.startContainer as Text,
      offset: range.startOffset,
    };
  }

  return null;
}

function extractTextAnchorFromSelection(container: HTMLElement, selection: Selection): Pick<
  OrphanReplyAnchor,
  "anchorText" | "anchorPrefix" | "anchorSuffix" | "anchorTextOffset"
> {
  const range = selection.getRangeAt(0);
  if (!container.contains(range.commonAncestorContainer)) {
    return {};
  }

  const anchorText = selection.toString().replace(/\s+/g, " ").trim().slice(0, 512);
  if (!anchorText) return {};

  const startNode = range.startContainer;
  const startOffset = range.startOffset;
  const endNode = range.endContainer;
  const endOffset = range.endOffset;

  const prefix = (startNode.textContent ?? "").slice(Math.max(0, startOffset - 48), startOffset).trim().slice(-32);
  const suffix = (endNode.textContent ?? "").slice(endOffset, endOffset + 48).trim().slice(0, 32);

  return {
    anchorText,
    anchorPrefix: prefix || undefined,
    anchorSuffix: suffix || undefined,
    anchorTextOffset: startOffset,
  };
}

function extractTextAnchor(container: HTMLElement, clientX: number, clientY: number): Pick<
  OrphanReplyAnchor,
  "anchorText" | "anchorPrefix" | "anchorSuffix" | "anchorTextOffset"
> {
  const caretMatch = getCaretMatchFromPoint(clientX, clientY);
  if (!caretMatch || !container.contains(caretMatch.node)) {
    const fallbackText = container.textContent?.replace(/\s+/g, " ").trim().slice(0, 64);
    return fallbackText
      ? { anchorText: fallbackText }
      : {};
  }

  const sourceText = caretMatch.node.textContent ?? "";
  if (!sourceText.trim()) {
    return {};
  }

  let start = caretMatch.offset;
  let end = caretMatch.offset;

  while (start > 0 && !/\s/.test(sourceText[start - 1] ?? "") && caretMatch.offset - start < 36) {
    start -= 1;
  }
  while (end < sourceText.length && !/\s/.test(sourceText[end] ?? "") && end - caretMatch.offset < 36) {
    end += 1;
  }

  if (end - start < 8) {
    start = Math.max(0, caretMatch.offset - 18);
    end = Math.min(sourceText.length, caretMatch.offset + 30);
  }

  const anchorText = sourceText.slice(start, end).replace(/\s+/g, " ").trim().slice(0, 96);
  const anchorPrefix = sourceText
    .slice(Math.max(0, start - 24), start)
    .replace(/\s+/g, " ")
    .trim()
    .slice(-24);
  const anchorSuffix = sourceText
    .slice(end, Math.min(sourceText.length, end + 24))
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 24);

  return {
    ...(anchorText ? { anchorText } : {}),
    ...(anchorPrefix ? { anchorPrefix } : {}),
    ...(anchorSuffix ? { anchorSuffix } : {}),
    anchorTextOffset: caretMatch.offset,
  };
}

function getTextNodes(root: HTMLElement): Text[] {
  if (typeof document === "undefined") {
    return [];
  }

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];

  let currentNode = walker.nextNode();
  while (currentNode) {
    if (currentNode.nodeType === Node.TEXT_NODE && currentNode.textContent?.trim()) {
      nodes.push(currentNode as Text);
    }
    currentNode = walker.nextNode();
  }

  return nodes;
}

function findBestTextMatch(
  container: HTMLElement,
  anchor: OrphanReplyAnchor,
): { node: Text; startOffset: number; endOffset: number } | null {
  if (!anchor.anchorText) {
    return null;
  }

  const nodes = getTextNodes(container);
  if (nodes.length === 0) {
    return null;
  }

  const normalizedTarget = anchor.anchorText.replace(/\s+/g, " ").trim();
  if (!normalizedTarget) {
    return null;
  }

  let bestMatch:
    | {
        node: Text;
        index: number;
        score: number;
      }
    | null = null;

  for (const node of nodes) {
    const rawContent = node.textContent ?? "";
    const sourceNormalized = rawContent.replace(/\s+/g, " ");
    if (!sourceNormalized.trim()) {
      continue;
    }

    let cursor = 0;
    while (cursor < sourceNormalized.length) {
      const indexNormalized = sourceNormalized.indexOf(normalizedTarget, cursor);
      if (indexNormalized < 0) {
        break;
      }

      let rawIndex = 0;
      let normalizedIndexCounter = 0;
      while (rawIndex < rawContent.length && normalizedIndexCounter < indexNormalized) {
        const char = rawContent[rawIndex];
        const isWhitespace = /\s/.test(char);
        if (isWhitespace) {
          normalizedIndexCounter += 1;
          while (rawIndex < rawContent.length && /\s/.test(rawContent[rawIndex])) {
            rawIndex += 1;
          }
        } else {
          normalizedIndexCounter += 1;
          rawIndex += 1;
        }
      }

      let score = normalizedTarget.length;
      if (
        anchor.anchorPrefix &&
        sourceNormalized
          .slice(Math.max(0, indexNormalized - anchor.anchorPrefix.length), indexNormalized)
          .includes(anchor.anchorPrefix)
      ) {
        score += 24;
      }
      if (
        anchor.anchorSuffix &&
        sourceNormalized
          .slice(
              indexNormalized + normalizedTarget.length,
              indexNormalized + normalizedTarget.length + anchor.anchorSuffix.length,
          )
          .includes(anchor.anchorSuffix)
      ) {
        score += 24;
      }

      if (!bestMatch || score > bestMatch.score) {
        bestMatch = { node, index: rawIndex, score };
      }

      cursor = indexNormalized + Math.max(1, normalizedTarget.length);
    }
  }

  if (!bestMatch) {
    return null;
  }

  const startOffset = bestMatch.index;
  const endOffset = Math.min(
    (bestMatch.node.textContent ?? "").length,
    startOffset + anchor.anchorText.length,
  );

  return { node: bestMatch.node, startOffset, endOffset };
}

function resolveFromTextAnchor(
  container: HTMLElement,
  anchor: OrphanReplyAnchor,
): ResolvedDotPosition | null {
  const match = findBestTextMatch(container, anchor);
  if (!match) return null;

  const range = document.createRange();
  range.setStart(match.node, match.startOffset);
  range.setEnd(match.node, Math.min(match.node.textContent?.length ?? 0, match.startOffset + 16));

  const targetRect = range.getBoundingClientRect();
  range.detach?.();

  if (!targetRect.width && !targetRect.height) {
    return null;
  }

  const containerRect = container.getBoundingClientRect();
  return {
    left: clamp(targetRect.left - containerRect.left, 8, Math.max(8, containerRect.width - 8)),
    top: clamp(targetRect.top - containerRect.top, 8, Math.max(8, containerRect.height - 8)),
  };
}

export function resolveStickyMarkerHighlightRects(
  container: HTMLElement,
  anchor: OrphanReplyAnchor,
): { left: number; top: number; width: number; height: number }[] {
  const match = findBestTextMatch(container, anchor);
  if (!match) return [];

  const range = document.createRange();
  range.setStart(match.node, match.startOffset);
  range.setEnd(match.node, match.endOffset);

  const rects = Array.from(range.getClientRects());
  range.detach?.();

  const containerRect = container.getBoundingClientRect();
  return rects.map(r => ({
    left: r.left - containerRect.left,
    top: r.top - containerRect.top,
    width: r.width,
    height: r.height,
  }));
}

export function getStickyMarkerMessageId(message: ChatMessage): string {
  return message.messageId ?? message.id ?? `ts_${message.timestamp}`;
}

export function buildOrphanReplyAnchor(params: {
  container: HTMLElement;
  message: ChatMessage;
  clientX?: number;
  clientY?: number;
  selection?: Selection | null;
}): OrphanReplyAnchor {
  const { container, message, selection } = params;
  const rect = container.getBoundingClientRect();
  const fallbackX = rect.left + Math.min(28, Math.max(16, rect.width * 0.12));
  const fallbackY = rect.top + Math.min(28, Math.max(18, rect.height * 0.12));
  const clientX = params.clientX ?? fallbackX;
  const clientY = params.clientY ?? fallbackY;

  const baseAnchor = {
    surface: "chat_transcript" as const,
    anchorZone: "chat_area" as const,
    tapClientX: clientX,
    tapClientY: clientY,
    rowRelativeX: clamp(clientX - rect.left, 8, Math.max(8, rect.width - 8)),
    rowRelativeY: clamp(clientY - rect.top, 8, Math.max(8, rect.height - 8)),
    viewportWidth: typeof window !== "undefined" ? window.innerWidth : undefined,
    viewportHeight: typeof window !== "undefined" ? window.innerHeight : undefined,
    parentMessageTimestamp: message.timestamp,
    messageExcerpt: getMessageExcerpt(message),
    createdFromRole: message.role,
  };

  if (selection && !selection.isCollapsed) {
    const selectionAnchor = extractTextAnchorFromSelection(container, selection);
    if (selectionAnchor.anchorText) {
      return { ...baseAnchor, ...selectionAnchor };
    }
  }

  return {
    ...baseAnchor,
    ...extractTextAnchor(container, clientX, clientY),
  };
}

export function resolveStickyMarkerPosition(
  container: HTMLElement,
  anchor: OrphanReplyAnchor,
): ResolvedDotPosition {
  const currentViewportWidth = typeof window !== "undefined" ? window.innerWidth : anchor.viewportWidth;
  const currentViewportHeight = typeof window !== "undefined" ? window.innerHeight : anchor.viewportHeight;
  
  const textResolved = resolveFromTextAnchor(container, anchor);
  if (textResolved) {
    return textResolved;
  }

  return {
    left: clamp(anchor.rowRelativeX, 8, Math.max(8, container.clientWidth - 8)),
    top: clamp(anchor.rowRelativeY, 8, Math.max(8, container.clientHeight - 8)),
  };
}

function parseStoredDraftMarkers(rawValue: string | null): StoredDraftMarkersByConversation {
  if (!rawValue) {
    return {};
  }

  try {
    const parsed = JSON.parse(rawValue) as StoredDraftMarkersByConversation;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function readStoredDraftMarkers(): StoredDraftMarkersByConversation {
  if (typeof window === "undefined") {
    return {};
  }

  return parseStoredDraftMarkers(window.localStorage.getItem(STICKY_THREAD_DRAFTS_STORAGE_KEY));
}

function writeStoredDraftMarkers(nextValue: StoredDraftMarkersByConversation): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    STICKY_THREAD_DRAFTS_STORAGE_KEY,
    JSON.stringify(nextValue),
  );
}

export function loadDraftStickyThreadMarkers(conversationId: string | null | undefined): StickyThreadMarker[] {
  if (!conversationId) {
    return [];
  }

  return readStoredDraftMarkers()[conversationId] ?? [];
}

export function upsertDraftStickyThreadMarker(marker: StickyThreadMarker): StickyThreadMarker[] {
  const store = readStoredDraftMarkers();
  const current = store[marker.parentConversationId] ?? [];
  const nextMarkers = current.some((existingMarker) => existingMarker.markerId === marker.markerId)
    ? current.map((existingMarker) => (existingMarker.markerId === marker.markerId ? marker : existingMarker))
    : [...current, marker];

  writeStoredDraftMarkers({
    ...store,
    [marker.parentConversationId]: nextMarkers,
  });

  return nextMarkers;
}

export function removeDraftStickyThreadMarker(params: {
  parentConversationId: string;
  markerId: string;
}): StickyThreadMarker[] {
  const store = readStoredDraftMarkers();
  const current = store[params.parentConversationId] ?? [];
  const nextMarkers = current.filter((marker) => marker.markerId !== params.markerId);
  const nextStore = { ...store };

  if (nextMarkers.length === 0) {
    delete nextStore[params.parentConversationId];
  } else {
    nextStore[params.parentConversationId] = nextMarkers;
  }

  writeStoredDraftMarkers(nextStore);
  return nextMarkers;
}
