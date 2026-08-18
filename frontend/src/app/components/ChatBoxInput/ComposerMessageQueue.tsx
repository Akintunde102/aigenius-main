import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ListOrdered, X } from 'lucide-react';
import type { QueuedComposerMessage } from '@/app/components/model-interface/features/chat/hooks/messageSendQueue.types';

interface ComposerMessageQueueProps {
    queuedMessages: QueuedComposerMessage[];
    onRemoveQueuedMessage: (messageId: string) => void;
    mini?: boolean;
}

export const ComposerMessageQueue: React.FC<ComposerMessageQueueProps> = ({
    queuedMessages,
    onRemoveQueuedMessage,
    mini = false,
}) => {
    const [open, setOpen] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);

    const close = useCallback(() => setOpen(false), []);

    useEffect(() => {
        if (!open) {
            return;
        }

        const handlePointerDown = (event: MouseEvent) => {
            if (!rootRef.current?.contains(event.target as Node)) {
                close();
            }
        };

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                close();
            }
        };

        document.addEventListener('mousedown', handlePointerDown);
        document.addEventListener('keydown', handleEscape);
        return () => {
            document.removeEventListener('mousedown', handlePointerDown);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [close, open]);

    useEffect(() => {
        if (queuedMessages.length === 0) {
            setOpen(false);
        }
    }, [queuedMessages.length]);

    if (queuedMessages.length === 0) {
        return null;
    }

    return (
        <div ref={rootRef} className="relative flex-shrink-0">
            <button
                type="button"
                onClick={() => setOpen((prev) => !prev)}
                className={`relative inline-flex items-center justify-center rounded-full border transition-colors [border-color:var(--chat-composer-border)] [background-color:color-mix(in_srgb,var(--chat-composer-bg)_88%,transparent)] [color:var(--sidebar-muted-fg)] hover:[color:var(--sidebar-fg)] hover:[background-color:var(--chat-composer-bg)] ${mini ? 'h-7 w-7' : 'h-8 w-8'}`}
                title="Queued messages"
                aria-label={`${queuedMessages.length} queued message${queuedMessages.length === 1 ? '' : 's'}`}
                aria-expanded={open}
                aria-haspopup="dialog"
            >
                <ListOrdered size={mini ? 14 : 16} />
                <span
                    className="absolute -right-1 -top-1 inline-flex min-h-[16px] min-w-[16px] items-center justify-center rounded-full bg-[var(--sidebar-fg)] px-1 text-[10px] font-semibold leading-none text-[var(--sidebar-bg)]"
                    aria-hidden="true"
                >
                    {queuedMessages.length}
                </span>
            </button>

            {open ? (
                <div
                    role="dialog"
                    aria-label="Queued messages"
                    className="absolute bottom-[calc(100%+8px)] right-0 z-50 w-[min(92vw,320px)] overflow-hidden rounded-xl border shadow-lg [border-color:var(--chat-composer-border)] [background-color:var(--chat-composer-bg)]"
                >
                    <div className="border-b px-3 py-2 text-xs font-semibold uppercase tracking-wide [border-color:var(--chat-composer-border)] [color:var(--sidebar-muted-fg)]">
                        Queued messages
                    </div>
                    <ul className="max-h-56 overflow-y-auto py-1">
                        {queuedMessages.map((message, index) => (
                            <li
                                key={message.id}
                                className="group flex items-start gap-2 px-3 py-2 text-sm [color:var(--sidebar-fg)] hover:[background-color:color-mix(in_srgb,var(--chat-composer-bg)_70%,var(--sidebar-fg)_8%)]"
                            >
                                <div className="min-w-0 flex-1">
                                    <div className="mb-0.5 text-[11px] font-medium uppercase tracking-wide [color:var(--sidebar-muted-fg)]">
                                        #{index + 1} · {message.modelName}
                                    </div>
                                    <p className="line-clamp-3 whitespace-pre-wrap break-words">
                                        {message.text}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => onRemoveQueuedMessage(message.id)}
                                    className="mt-0.5 rounded-full p-1 opacity-60 transition-opacity hover:opacity-100"
                                    title="Remove from queue"
                                    aria-label={`Remove queued message ${index + 1}`}
                                >
                                    <X size={14} />
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
            ) : null}
        </div>
    );
};
