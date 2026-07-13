'use client';

import React, { useCallback, useState } from 'react';
import { FiChevronDown, FiChevronUp } from 'react-icons/fi';
import type { ChatMessage, MessageEvent } from '@/app/components/model-interface/shared/types/types';
import { buildChatMessageDisplayBlocks } from '../../messages/components/chatMessageDisplay.utils';
import { TextMessage } from '../../message-types';
import { ToolStreamingCard } from './ToolStreamingCard';
import { getAgentRunById } from '@/lib/calls/agent-run';
import { textPartToPlainString } from '@/lib/utils/messageTextUtils';
import { ERROR_MESSAGES } from '../hooks/chatOperations.constants';

function filterDisplayEvents(events: unknown[] | undefined): MessageEvent[] {
    if (!events?.length) {
        return [];
    }
    return events.filter((e): e is MessageEvent => e != null && typeof e === 'object' && 'type' in e);
}

function TranscriptMessage({ msg }: { msg: ChatMessage }) {
    if (msg.role === 'assistant' && filterDisplayEvents(msg.events).length > 0) {
        const displayEvents = filterDisplayEvents(msg.events);
        const blocks = buildChatMessageDisplayBlocks(displayEvents, { streaming: false });
        return (
            <div className="rounded-lg border border-[rgba(58,71,87,0.1)] bg-[rgba(255,249,242,0.5)] px-3 py-2 space-y-2">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Assistant</div>
                <div className="flex flex-col gap-2">
                    {blocks.map((block, i) => {
                        if (block.type === 'text') {
                            return (
                                <TextMessage
                                    key={i}
                                    content={block.content}
                                    streaming={false}
                                    role="assistant"
                                />
                            );
                        }
                        const toolEvt = block.event;
                        return (
                            <div key={i} className="w-full">
                                <ToolStreamingCard
                                    streaming_tool={{
                                        tool: toolEvt.tool,
                                        displayName: toolEvt.displayName,
                                        logs: toolEvt.logs,
                                        loading: toolEvt.loading,
                                        success: toolEvt.success,
                                        arguments: toolEvt.arguments,
                                    }}
                                    result={toolEvt.result}
                                    arguments={toolEvt.arguments}
                                />
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    }

    if (msg.role === 'user') {
        const text = textPartToPlainString(msg.content);
        return (
            <div className="rounded-lg border border-[rgba(76,127,217,0.2)] bg-[rgba(255,255,255,0.7)] px-3 py-2">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1">Goal</div>
                <TextMessage content={text || '(no text)'} streaming={false} role="user" />
            </div>
        );
    }

    if (msg.role === 'system') {
        const text = textPartToPlainString(msg.content);
        return (
            <div className="rounded-md bg-slate-50 px-2 py-1.5 text-xs text-slate-600 border border-slate-100">
                <span className="font-semibold text-slate-500">System · </span>
                {text || '(empty)'}
            </div>
        );
    }

    const text = textPartToPlainString(msg.content);
    return (
        <div className="rounded-lg border border-slate-100 bg-white px-3 py-2 text-sm text-slate-800">
            <TextMessage content={text || '(no content)'} streaming={false} role={msg.role} />
        </div>
    );
}

type Props = {
    agentRunId: string;
};

/** Lazy-loads persisted workflow-intent transcript; renders assistant `events` like the main chat. */
export function WorkflowIntentTranscriptExpand({ agentRunId }: Props) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [messages, setMessages] = useState<ChatMessage[] | null>(null);

    const load = useCallback(async () => {
        if (messages !== null || loading) {
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const run = await getAgentRunById(agentRunId);
            setMessages(Array.isArray(run.messages) ? run.messages : []);
        } catch {
            setError(ERROR_MESSAGES.GENERIC_CHAT_ERROR);
        } finally {
            setLoading(false);
        }
    }, [agentRunId, messages, loading]);

    const toggle = () => {
        const next = !open;
        setOpen(next);
        if (next) {
            void load();
        }
    };

    return (
        <>
            <button
                type="button"
                onClick={toggle}
                className="w-full min-h-10 px-3 py-2 flex items-center justify-between gap-2 text-xs font-semibold text-[var(--app-ink-600)] hover:bg-[rgba(245,247,250,0.9)] transition-colors border-t border-[rgba(58,71,87,0.08)]"
            >
                <span>Sub-agent transcript</span>
                {open ? <FiChevronUp className="w-3.5 h-3.5 shrink-0" /> : <FiChevronDown className="w-3.5 h-3.5 shrink-0" />}
            </button>
            {open && (
                <div className="px-3 py-2.5 space-y-3 border-t border-[rgba(58,71,87,0.08)] bg-[rgba(248,250,252,0.6)] max-h-[min(70vh,520px)] overflow-y-auto">
                    {loading && <p className="text-xs text-slate-600">Loading transcript…</p>}
                    {error && <p className="text-xs text-red-700">{error}</p>}
                    {!loading && !error && messages && messages.length === 0 && (
                        <p className="text-xs text-slate-600">No messages recorded for this run.</p>
                    )}
                    {!loading && !error && messages && messages.length > 0 && (
                        <div className="flex flex-col gap-3">
                            {messages.map((m, idx) => (
                                <TranscriptMessage key={m.messageId ?? m.id ?? `m-${idx}`} msg={m} />
                            ))}
                        </div>
                    )}
                </div>
            )}
        </>
    );
}
