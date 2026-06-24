import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { FiX } from 'react-icons/fi';
import { Model } from '@/app/components/model-interface/shared/types';
import {
    getModelAverageRequestPrice,
    formatUSD,
    formatNGN,
    getModelDisplayName,
    getProvider,
    getProviderLabel,
} from '@/app/components/model-interface/shared/utils';

interface ModelDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    model: Model | null;
    onPickModel?: (model: Model) => void;
}

function formatContextLength(n: number): string {
    if (!Number.isFinite(n)) return '—';
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
    return String(n);
}

function pricingLabel(key: string): string {
    const k = key.toLowerCase();
    if (k === 'prompt') return 'Input';
    if (k === 'completion') return 'Output';
    if (k === 'input_cache_read') return 'Cache Read';
    if (k === 'input_cache_write') return 'Cache Write';
    if (k === 'image') return 'Images';
    if (k === 'request') return 'Per Request';

    return key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

export function ModelDetailsModal({ isOpen, onClose, model, onPickModel }: ModelDetailsModalProps) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (!isOpen) return;
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen || !model) return null;
    if (!mounted) return null;

    const provider = getProvider(model.id);
    const providerLabel = getProviderLabel(provider) || provider;
    const isFree = provider === 'openrouter' && model.id?.split('/')[1]?.toLowerCase() === 'free';
    const avgCost = getModelAverageRequestPrice(model);
    const showAvgCost = Number.isFinite(avgCost) && avgCost > 0;
    const inputMods = model.architecture?.input_modalities ?? [];
    const outputMods = model.architecture?.output_modalities ?? [];
    const hasModalities = inputMods.length > 0 || outputMods.length > 0;
    const hasPricing = model.pricing && Object.keys(model.pricing).length > 0;
    const releaseDate = model?.created
        ? new Date(model.created * 1000).toLocaleString(undefined, { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })
        : null;

    const portalTarget =
        typeof document !== 'undefined'
            ? document.getElementById('modal-root') ?? document.body
            : null;
    if (!portalTarget) return null;

    return createPortal(
        (
            <div
                className="fixed inset-0 z-[120] flex items-center justify-center p-4 transition-opacity duration-200"
                style={{ background: "var(--modal-overlay)" }}
                onClick={onClose}
                role="dialog"
                aria-modal="true"
                aria-labelledby="model-details-title"
            >
                <div
                    className="app-modal-panel max-h-[90vh] w-full max-w-lg rounded-2xl shadow-2xl"
                    onClick={e => e.stopPropagation()}
                >
                    {/* Header: title + Use model on one line, compact */}
                    <div className="flex items-center justify-between gap-3 border-b px-4 py-3" style={{ borderColor: "var(--modal-border)" }}>
                        <div className="min-w-0 flex-1 flex items-center gap-2">
                            <h2 id="model-details-title" className="text-lg font-semibold text-slate-900 dark:text-zinc-100 truncate">
                                {getModelDisplayName(model)}
                            </h2>
                            <span className="inline-flex items-center rounded bg-slate-100 dark:bg-zinc-800 px-1.5 py-0.5 text-[10px] font-medium text-slate-600 dark:text-zinc-300 shrink-0">
                                {isFree ? 'Free' : providerLabel}
                            </span>
                            {model.context_length > 0 && (
                                <span className="text-[10px] text-slate-500 dark:text-zinc-500 shrink-0">
                                    {formatContextLength(model.context_length)} ctx
                                </span>
                            )}
                            {releaseDate && (
                                <span className="text-[10px] text-slate-400 dark:text-zinc-500 shrink-0 flex items-center gap-1">
                                    <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-zinc-600" />
                                    {releaseDate}
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                            {onPickModel && (
                                <button
                                    type="button"
                                    className="app-modal-btn-primary rounded-md px-2.5 py-1 text-xs"
                                    onClick={() => onPickModel(model)}
                                    title="Use this model"
                                >
                                    Use model
                                </button>
                            )}
                            <button
                                type="button"
                                className="rounded-md p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:text-zinc-500 dark:hover:text-zinc-200 dark:hover:bg-zinc-800 transition-colors"
                                onClick={onClose}
                                title="Close"
                                aria-label="Close"
                            >
                                <FiX size={18} strokeWidth={2} />
                            </button>
                        </div>
                    </div>

                    {/* Body: scrollable */}
                    <div className="overflow-y-auto flex-1 px-5 pb-5 space-y-5">
                        {/* Description */}
                        <section>
                            <p className="text-sm text-slate-600 dark:text-zinc-400 leading-relaxed whitespace-pre-line">
                                {model.description || 'No description available.'}
                            </p>
                        </section>

                        {/* Modalities */}
                        {hasModalities && (
                            <section className="space-y-3">
                                <h3 className="text-xs font-medium uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                                    Capabilities
                                </h3>
                                <div className="flex flex-wrap gap-2">
                                    {inputMods.map((m, i) => (
                                        <span
                                            key={`in-${i}`}
                                            className="inline-flex rounded-md bg-slate-100 dark:bg-zinc-800 px-2 py-1 text-xs text-slate-600 dark:text-zinc-300"
                                        >
                                            {m}
                                        </span>
                                    ))}
                                    {outputMods.map((m, i) => (
                                        <span
                                            key={`out-${i}`}
                                            className="inline-flex rounded-md bg-slate-100 dark:bg-zinc-800 px-2 py-1 text-xs text-slate-600 dark:text-zinc-300"
                                        >
                                            {m}
                                        </span>
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* Pricing */}
                        {hasPricing && (
                            <section className="space-y-3">
                                <h3 className="text-xs font-medium uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                                    Pricing
                                </h3>
                                <div className="rounded-xl bg-slate-50/80 border border-slate-100 dark:bg-zinc-800/80 dark:border-zinc-700 p-3 space-y-2">
                                    {model.pricing && Object.entries(model.pricing).map(([key, value]) => {
                                        const numValue = parseFloat(String(value));
                                        const k = key.toLowerCase();
                                        const isTokenBased = k === 'prompt' || k === 'completion' || k.includes('cache');

                                        const multiplier = isTokenBased ? 1000000 : 1;
                                        let unit = isTokenBased ? '/ 1M tokens' : '';

                                        if (k === 'image') unit = '/ image';
                                        if (k === 'web_search') unit = '/ search';
                                        if (k === 'request') unit = '/ request';
                                        if (k === 'audio') unit = '/ second';

                                        const displayValue = isNaN(numValue) ? value : `$${(numValue * multiplier).toFixed(k === 'web_search' || k === 'request' || k === 'image' ? 3 : 2)} ${unit}`;

                                        return (
                                            <div key={key} className="flex justify-between items-baseline text-sm">
                                                <span className="text-slate-600 dark:text-zinc-400">{pricingLabel(key)}</span>
                                                <span className="font-mono text-slate-900 dark:text-zinc-100 tabular-nums">
                                                    {displayValue}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </section>
                        )}

                        {/* Average cost */}
                        {showAvgCost && (
                            <section className="rounded-xl bg-emerald-50/80 border border-emerald-100 dark:bg-emerald-950/40 dark:border-emerald-800/70 p-3">
                                <p className="text-xs font-medium text-emerald-800/90 dark:text-emerald-300 mb-0.5">
                                    Est. cost per message
                                </p>
                                <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-200 tabular-nums">
                                    {formatNGN(avgCost)} credits
                                </p>
                                <p className="text-xs text-emerald-700/80 dark:text-emerald-400/90">
                                    {formatUSD(avgCost)} USD
                                </p>
                            </section>
                        )}
                    </div>
                </div>
            </div>) as any,
        portalTarget,
    );
} 