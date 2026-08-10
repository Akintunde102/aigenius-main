import { ChatMessage } from '@/app/components/model-interface/shared/types';

/** Stable scalar used to trigger follow-scroll when the last message grows during streaming. */
export function computeLastMessageScrollSignal(chat: ChatMessage[]): number {
    if (chat.length === 0) {
        return 0;
    }

    const last = chat[chat.length - 1];
    let signal = 0;

    if (typeof last.content === 'string') {
        signal += last.content.length;
    } else if (last.content != null) {
        signal += JSON.stringify(last.content).length;
    }

    if (last.reasoning) {
        signal += last.reasoning.length;
    }

    if (last.events?.length) {
        signal += JSON.stringify(last.events).length;
    }

    return signal;
}
