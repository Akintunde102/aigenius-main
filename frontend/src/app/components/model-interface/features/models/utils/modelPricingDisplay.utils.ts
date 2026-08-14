export interface PricingTierOverride {
    min_prompt_tokens?: number;
    prompt?: string;
    completion?: string;
    input_cache_read?: string;
    input_cache_write?: string;
    input_cache_write_1h?: string;
    [key: string]: string | number | undefined;
}

function isScalarPricingValue(value: unknown): value is string | number {
    return typeof value === 'string' || typeof value === 'number';
}

export function pricingLabel(key: string): string {
    const k = key.toLowerCase();
    if (k === 'prompt') return 'Input';
    if (k === 'completion') return 'Output';
    if (k === 'input_cache_read') return 'Cache Read';
    if (k === 'input_cache_write') return 'Cache Write';
    if (k === 'input_cache_write_1h') return 'Cache Write (1h)';
    if (k === 'image') return 'Images';
    if (k === 'request') return 'Per Request';

    return key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

export function getScalarPricingEntries(
    pricing: Record<string, unknown> | undefined,
): Array<[string, string]> {
    if (!pricing) return [];

    return Object.entries(pricing)
        .filter(([key, value]) => key !== 'overrides' && isScalarPricingValue(value))
        .map(([key, value]) => [key, String(value)]);
}

export function getPricingOverrides(
    pricing: Record<string, unknown> | undefined,
): PricingTierOverride[] {
    const overrides = pricing?.overrides;
    if (!Array.isArray(overrides)) return [];

    return overrides.filter(
        (item): item is PricingTierOverride =>
            item !== null && typeof item === 'object' && !Array.isArray(item),
    );
}

function formatTokenThreshold(n: number): string {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
    if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
    return String(n);
}

export function formatPricingTierLabel(minPromptTokens?: number): string {
    if (typeof minPromptTokens === 'number' && minPromptTokens > 0) {
        return `≥ ${formatTokenThreshold(minPromptTokens)} prompt tokens`;
    }
    return 'Additional tier';
}

export function formatPricingAmount(key: string, rawValue: string): string {
    const numValue = parseFloat(rawValue);
    const k = key.toLowerCase();
    const isTokenBased = k === 'prompt' || k === 'completion' || k.includes('cache');

    const multiplier = isTokenBased ? 1_000_000 : 1;
    let unit = isTokenBased ? '/ 1M tokens' : '';

    if (k === 'image') unit = '/ image';
    if (k === 'web_search') unit = '/ search';
    if (k === 'request') unit = '/ request';
    if (k === 'audio') unit = '/ second';

    if (Number.isNaN(numValue)) return rawValue;

    const decimals = k === 'web_search' || k === 'request' || k === 'image' ? 3 : 2;
    return `$${(numValue * multiplier).toFixed(decimals)} ${unit}`.trim();
}

export function getTierPricingEntries(tier: PricingTierOverride): Array<[string, string]> {
    return Object.entries(tier)
        .filter(([key, value]) => key !== 'min_prompt_tokens' && isScalarPricingValue(value))
        .map(([key, value]) => [key, String(value)]);
}
