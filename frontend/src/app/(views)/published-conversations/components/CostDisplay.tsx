import React from 'react';
import { ChatMessage as ChatMessageType } from '@/app/components/model-interface/shared/types';
import { timeAgo } from '@/lib/time-ago';
import { formatTime } from '@/lib/utils/modelInterfaceUtils';

interface CostDisplayProps {
    msg: ChatMessageType;
    streaming: boolean;
    showCosts: boolean;
    cost: number;
    formatCost: (cost: number, showNaira: boolean) => string;
    assistantFooterLabel?: string;
}

export const CostDisplay: React.FC<CostDisplayProps> = ({
    msg,
    streaming,
    showCosts,
    cost,
    formatCost,
    assistantFooterLabel,
}) => (
    <div className="flex items-center justify-end gap-2 flex-wrap min-w-0">
        {msg.role === 'assistant' && (
            typeof msg.cost === 'number' ? (
                <span className="text-green-600 font-medium">₦{(msg.cost * 1400).toFixed(2)}</span>
            ) : streaming ? (
                showCosts && <span className="text-gray-400 animate-pulse">calculating...</span>
            ) : (
                showCosts && <span className="text-green-600">-</span>
            )
        )}
        {msg.cost === undefined && !streaming && showCosts && cost > 0 && (
            <span className="text-green-600">{formatCost(cost, true)}</span>
        )}
        {msg.role === 'assistant' && assistantFooterLabel ? (
            <span
                className="font-semibold text-slate-600 truncate max-w-[12rem] shrink"
                title={assistantFooterLabel}
            >
                {assistantFooterLabel}
            </span>
        ) : null}
        <span className="shrink-0" title={formatTime(msg.timestamp)}>
            {timeAgo(new Date(msg.timestamp).toISOString())}
        </span>
    </div>
);
