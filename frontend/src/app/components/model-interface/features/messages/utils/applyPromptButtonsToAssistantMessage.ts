import type {
    ChatMessage,
    MessageEvent,
    TextEvent,
} from '@/app/components/model-interface/shared/types';
import { parseAndStripPromptButtons } from '@/lib/utils/promptButtons.utils';

function findLastTextEventIndex(events: MessageEvent[]): number {
    for (let i = events.length - 1; i >= 0; i -= 1) {
        if (events[i].type === 'text') {
            return i;
        }
    }
    return -1;
}

export function applyPromptButtonsToAssistantMessage(msg: ChatMessage): ChatMessage {
    if (msg.role !== 'assistant') {
        return msg;
    }

    let content = msg.content;
    let promptButtons = msg.prompt_buttons ?? [];
    let events = msg.events;

    if (typeof content === 'string') {
        const parsed = parseAndStripPromptButtons(content);
        content = parsed.content;
        if (!promptButtons.length) {
            promptButtons = parsed.promptButtons;
        }
    }

    if (events?.length) {
        const lastTextIdx = findLastTextEventIndex(events);
        if (lastTextIdx >= 0) {
            const textEvt = events[lastTextIdx] as TextEvent;
            const parsed = parseAndStripPromptButtons(textEvt.content);
            if (!promptButtons.length) {
                promptButtons = parsed.promptButtons;
            }
            if (parsed.content !== textEvt.content) {
                const nextEvents = [...events] as MessageEvent[];
                nextEvents[lastTextIdx] = { ...textEvt, content: parsed.content };
                events = nextEvents;
            }
        }
    }

    return {
        ...msg,
        content,
        ...(events && { events }),
        ...(promptButtons.length > 0 ? { prompt_buttons: promptButtons } : {}),
    };
}

export function resolvePromptButtonsForAssistantMessage(msg: ChatMessage): string[] {
    if (msg.role !== 'assistant') {
        return [];
    }
    if (msg.prompt_buttons?.length) {
        return msg.prompt_buttons;
    }
    if (typeof msg.content === 'string') {
        return parseAndStripPromptButtons(msg.content).promptButtons;
    }
    const events = msg.events;
    const lastTextIdx = events ? findLastTextEventIndex(events) : -1;
    const lastText = lastTextIdx >= 0 ? (events![lastTextIdx] as TextEvent) : undefined;
    if (lastText?.content) {
        return parseAndStripPromptButtons(lastText.content).promptButtons;
    }
    return [];
}

export function displayContentWithoutPromptButtons(msg: ChatMessage): ChatMessage['content'] {
    if (msg.role !== 'assistant') {
        return msg.content;
    }
    if (typeof msg.content === 'string') {
        return parseAndStripPromptButtons(msg.content).content;
    }
    return msg.content;
}
