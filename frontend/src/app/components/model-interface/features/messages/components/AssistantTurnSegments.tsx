'use client';

import React from 'react';
import type { ChatMessage as ChatMessageType } from '@/app/components/model-interface/shared/types';
import type { AssistantRenderSegment } from '../../chat/components/assistant-turn-summary.utils';
import { ToolStreamingCard } from '../../chat/components/ToolStreamingCard';
import { ToolStreamingGroup } from '../../chat/components/ToolStreamingGroup';
import { ReasoningGroup } from '../../chat/components/ReasoningGroup';
import { AssistantWorkSummary } from '../../chat/components/AssistantWorkSummary';
import { TextMessage } from '../../message-types';

export type AssistantTurnSegmentsProps = {
    segments: AssistantRenderSegment[];
    messageRole: ChatMessageType['role'];
    streaming: boolean;
    gapClassName?: string;
};

/** Shared event-segment renderer for main chat and published conversations. */
export function AssistantTurnSegments({
    segments,
    messageRole,
    streaming,
    gapClassName = 'flex flex-col gap-3 md:gap-4',
}: AssistantTurnSegmentsProps) {
    if (segments.length === 0) {
        return null;
    }

    return (
        <div className={gapClassName}>
            {segments.map((segment, index) => {
                if (segment.type === 'work_summary') {
                    return (
                        <div key={`work-summary-${index}`} className="w-full">
                            <AssistantWorkSummary items={segment.items} />
                        </div>
                    );
                }

                const block = segment.block;
                if (block.type === 'text') {
                    return (
                        <TextMessage
                            key={`text-${index}`}
                            content={block.content}
                            streaming={streaming && block.endsWithLastTextEvent}
                            role={messageRole}
                        />
                    );
                }

                if (block.type === 'thinking') {
                    return (
                        <div key={`thinking-${index}`} className="w-full">
                            <ReasoningGroup
                                event={block.event}
                                messageStreaming={streaming}
                            />
                        </div>
                    );
                }

                if (block.type === 'tool_cluster') {
                    return (
                        <div key={`tool-cluster-${index}`} className="w-full">
                            <ToolStreamingGroup
                                events={block.events}
                                messageStreaming={streaming}
                            />
                        </div>
                    );
                }

                if (block.type !== 'tool') {
                    return null;
                }

                const toolEvt = block.event;
                return (
                    <div key={`tool-${index}`} className="w-full">
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
    );
}
