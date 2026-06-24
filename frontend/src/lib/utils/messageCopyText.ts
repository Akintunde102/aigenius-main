import type { MessageEvent, TextEvent, ToolEvent } from '@/app/components/model-interface/shared/types';
import { textPartToPlainString } from '@/lib/utils/messageTextUtils';

/**
 * Plain-text representation of an assistant turn that uses `msg.events`
 * (interleaved text + tool calls), in **array order**. Used for clipboard copy
 * so it matches what the user sees, not only `msg.content` (which may be a single segment).
 */
export function buildCopyTextFromEvents(events: MessageEvent[]): string {
    const parts: string[] = [];
    for (const evt of events) {
        if (evt.type === 'text') {
            const t = textPartToPlainString((evt as TextEvent).content as unknown).trim();
            if (t) parts.push(t);
        } else if (evt.type === 'tool') {
            const te = evt as ToolEvent;
            const title = te.displayName?.trim() || te.tool;
            const lines: string[] = [`[${title}]`];
            if (te.arguments && Object.keys(te.arguments).length > 0) {
                try {
                    lines.push(JSON.stringify(te.arguments, null, 2));
                } catch {
                    lines.push(String(te.arguments));
                }
            }
            if (te.logs?.length) {
                lines.push(te.logs.map((l) => `[${l.tag}] ${l.message}`).join('\n'));
            }
            if (te.result?.trim()) {
                lines.push(`Result:\n${te.result.trim()}`);
            }
            parts.push(lines.join('\n'));
        }
    }
    return parts.join('\n\n');
}
