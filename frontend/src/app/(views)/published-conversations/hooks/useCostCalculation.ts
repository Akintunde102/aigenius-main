import { useMemo } from 'react';
import { ChatMessage as ChatMessageType } from '@/app/components/model-interface/shared/types';

/**
 * Display-only: uses backend-provided platform credits when present. No client estimation.
 */
export const useCostCalculation = (msg: ChatMessageType, showCosts: boolean) => {
    return useMemo(() => {
        if (!showCosts) return 0;
        if (typeof msg.cost_credits === 'number' && Number.isFinite(msg.cost_credits)) {
            return msg.cost_credits;
        }
        return 0;
    }, [msg.cost_credits, showCosts]);
};
