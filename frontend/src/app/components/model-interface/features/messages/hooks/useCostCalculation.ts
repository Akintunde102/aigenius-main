import { useMemo } from 'react';
import { ChatMessage as ChatMessageType } from '@/app/components/model-interface/shared/types';

/**
 * Display-only: uses backend-provided billed credits on the message when present.
 * No client-side USD conversion.
 */
export const useCostCalculation = (msg: ChatMessageType, showCosts: boolean) => {
    return useMemo(() => {
        if (!showCosts) return 0;
        if (typeof msg.cost_credits === 'number') {
            return msg.cost_credits;
        }
        return 0;
    }, [msg.cost_credits, showCosts]);
};
