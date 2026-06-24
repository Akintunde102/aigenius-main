import { useMemo } from 'react';
import { ChatMessage as ChatMessageType } from '@/app/components/model-interface/shared/types';

/**
 * Display-only: uses backend-provided USD total when present. No client estimation.
 */
export const useCostCalculation = (msg: ChatMessageType, showCosts: boolean) => {
    return useMemo(() => {
        if (!showCosts) return 0;
        if (typeof msg.cost === 'number') {
            return msg.cost;
        }
        return 0;
    }, [msg.cost, showCosts]);
};
