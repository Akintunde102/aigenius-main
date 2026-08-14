import {
    formatPricingAmount,
    formatPricingTierLabel,
    getPricingOverrides,
    getScalarPricingEntries,
    getTierPricingEntries,
} from '../modelPricingDisplay.utils';

describe('modelPricingDisplay.utils', () => {
    const tieredPricing = {
        prompt: '0.00000078',
        completion: '0.0000039',
        input_cache_read: '0.000000156',
        input_cache_write: '0.000000975',
        overrides: [
            {
                min_prompt_tokens: 32000,
                prompt: '0.00000156',
                completion: '0.0000078',
                input_cache_read: '0.000000312',
                input_cache_write: '0.00000195',
            },
            {
                min_prompt_tokens: 128000,
                prompt: '0.00000195',
                completion: '0.00000975',
            },
        ],
    };

    it('returns only scalar pricing entries and excludes overrides', () => {
        expect(getScalarPricingEntries(tieredPricing)).toEqual([
            ['prompt', '0.00000078'],
            ['completion', '0.0000039'],
            ['input_cache_read', '0.000000156'],
            ['input_cache_write', '0.000000975'],
        ]);
    });

    it('extracts pricing override tiers from overrides array', () => {
        expect(getPricingOverrides(tieredPricing)).toHaveLength(2);
        expect(getPricingOverrides(tieredPricing)[0].min_prompt_tokens).toBe(32000);
    });

    it('formats token-based pricing for display', () => {
        expect(formatPricingAmount('prompt', '0.00000078')).toBe('$0.78 / 1M tokens');
        expect(formatPricingAmount('web_search', '0.035')).toBe('$0.035 / search');
    });

    it('formats tier labels from min_prompt_tokens', () => {
        expect(formatPricingTierLabel(32000)).toBe('≥ 32K prompt tokens');
        expect(formatPricingTierLabel(128000)).toBe('≥ 128K prompt tokens');
    });

    it('returns tier entries without min_prompt_tokens metadata', () => {
        expect(getTierPricingEntries(tieredPricing.overrides[0])).toEqual([
            ['prompt', '0.00000156'],
            ['completion', '0.0000078'],
            ['input_cache_read', '0.000000312'],
            ['input_cache_write', '0.00000195'],
        ]);
    });
});
