import type { UsageInfo } from '@/app/components/model-interface/shared/types';

/** Model API rounds for this message (agent loop). Supports legacy persisted usage fields. */
export function getModelRoundCount(usage?: UsageInfo | null): number | undefined {
    if (!usage) {
        return undefined;
    }
    if (typeof usage.model_rounds === 'number' && Number.isFinite(usage.model_rounds)) {
        return usage.model_rounds;
    }
    const legacy = (usage as { openrouter_calls?: number }).openrouter_calls;
    if (typeof legacy === 'number' && Number.isFinite(legacy)) {
        return legacy;
    }
    return undefined;
}
