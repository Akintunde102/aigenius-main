import { renderHook } from '@testing-library/react';
import { useCostCalculation } from '../useCostCalculation';
import type { ChatMessage } from '@/app/components/model-interface/shared/types';

describe('useCostCalculation (published)', () => {
    const base: ChatMessage = {
        role: 'assistant',
        content: 'ok',
        timestamp: 1,
    };

    it('returns cost_credits when showCosts is true', () => {
        const { result } = renderHook(() =>
            useCostCalculation({ ...base, cost_credits: 12.5 }, true),
        );
        expect(result.current).toBe(12.5);
    });

    it('returns 0 when showCosts is false or credits are missing', () => {
        const hidden = renderHook(() => useCostCalculation({ ...base, cost_credits: 12.5 }, false));
        expect(hidden.result.current).toBe(0);

        const missing = renderHook(() => useCostCalculation(base, true));
        expect(missing.result.current).toBe(0);
    });
});
