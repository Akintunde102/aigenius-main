import React from 'react';
import { ChatMessage as ChatMessageType } from '@/app/components/model-interface/shared/types';
import { timeAgo } from "@/lib/time-ago";
import { formatTime } from '@/lib/utils/modelInterfaceUtils';

export type CostDisplayVariant = 'full' | 'costOnly' | 'metaOnly';

interface CostDisplayProps {
    msg: ChatMessageType;
    streaming: boolean;
    showCosts: boolean;
    cost: number;
    formatCost: (cost: number, showNaira: boolean) => string;
    /** Shown immediately before the timestamp (e.g. model name). */
    beforeTime?: React.ReactNode;
    /** Default `full`. Use `costOnly` + `metaOnly` to place cost beside the message actions menu. */
    variant?: CostDisplayVariant;
}

export const CostDisplay: React.FC<CostDisplayProps> = ({
    msg,
    streaming,
    showCosts,
    cost,
    formatCost,
    beforeTime,
    variant = 'full',
}) => {
    const costRow =
        msg.role === 'assistant' ? (
            typeof msg.cost === 'number' ? (
                <span className="font-medium text-[#2563EB]">₦{(msg.cost * 1400).toFixed(2)}</span>
            ) : streaming ? (
                showCosts ? (
                    <span className="animate-pulse text-[#94A3B8]">calculating...</span>
                ) : null
            ) : showCosts ? (
                <span className="text-[#94A3B8]">-</span>
            ) : null
        ) : null;

    const legacyCost =
        msg.cost === undefined && !streaming && showCosts && cost > 0 ? (
            <span className="text-[#2563EB]">{formatCost(cost, true)}</span>
        ) : null;

    const metaRow = (
        <>
            {beforeTime != null && beforeTime !== false && (
                <>
                    {beforeTime}
                    <span className="text-slate-300" aria-hidden>
                        ·
                    </span>
                </>
            )}
            <span className="text-[#94A3B8]" title={formatTime(msg.timestamp)}>
                {timeAgo(new Date(msg.timestamp).toISOString())}
            </span>
        </>
    );

    const textRowClass = 'flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] leading-snug';

    if (variant === 'costOnly') {
        return (
            <div className={`${textRowClass} shrink-0 justify-start`}>
                {costRow}
                {legacyCost}
            </div>
        );
    }

    if (variant === 'metaOnly') {
        return <div className={`${textRowClass} justify-end`}>{metaRow}</div>;
    }

    return (
        <div className={`${textRowClass} justify-end`}>
            {costRow}
            {legacyCost}
            {metaRow}
        </div>
    );
};
