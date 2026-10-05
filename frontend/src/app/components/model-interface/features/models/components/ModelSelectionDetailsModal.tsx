import React, { memo } from 'react';
import { FiX } from 'react-icons/fi';
import { Model } from '@/app/components/model-interface/shared/types';
import { formatUSD, formatNGN, getModelDisplayName, getModelAverageRequestPrice } from '@/app/components/model-interface/shared/utils';
import {
    formatPricingAmount,
    formatPricingTierLabel,
    getPricingOverrides,
    getScalarPricingEntries,
    getTierPricingEntries,
    pricingLabel,
} from '../utils/modelPricingDisplay.utils';

// Model Details Modal
type ModelSelectionDetailsModalProps = {
    model: Model;
    isOpen: boolean;
    onClose: () => void;
    averageCost: number;
};

const ModelSelectionDetailsModal = memo(function ModelDetailsModal({
    model,
    isOpen,
    onClose,
    averageCost,
}: ModelSelectionDetailsModalProps) {
    if (!isOpen) return null;

    const scalarPricingEntries = getScalarPricingEntries(model.pricing as Record<string, unknown> | undefined);
    const pricingOverrides = getPricingOverrides(model.pricing as Record<string, unknown> | undefined);
    const hasPricing = scalarPricingEntries.length > 0 || pricingOverrides.length > 0;

    return (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div
                className="rounded-xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden border flex flex-col"
                style={{
                    background: "var(--modal-bg)",
                    borderColor: "var(--modal-border)",
                    color: "var(--modal-fg)",
                }}
            >
                {/* Header */}
                <div className="flex justify-between items-center px-5 py-3.5 border-b" style={{ borderColor: "var(--modal-border)" }}>
                    <p
                        role="heading"
                        aria-level={2}
                        style={{ color: "var(--modal-fg)", fontSize: "0.9375rem", fontWeight: 600, margin: 0 }}
                    >
                        {getModelDisplayName(model)}
                    </p>
                    <button
                        className="h-8 w-8 rounded-lg flex items-center justify-center transition-colors duration-200 hover:bg-black/5 dark:hover:bg-white/10 hover:text-[var(--modal-fg)]"
                        style={{ color: "var(--modal-muted-fg)" }}
                        onClick={onClose}
                        title="Close details"
                    >
                        <FiX size={18} strokeWidth={2} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)] space-y-6">
                    {/* Basic Info */}
                    <div>
                        {model.subtitle && (
                            <p className="text-sm mb-4" style={{ color: "var(--modal-fg)", opacity: 0.85 }}>{model.subtitle}</p>
                        )}
                        {model.description && (
                            <p className="mb-4 text-sm leading-relaxed" style={{ color: "var(--modal-muted-fg)" }}>{model.description}</p>
                        )}
                    </div>

                    {/* Modalities */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <p className="font-semibold mb-2.5 text-[11px] uppercase tracking-wider" style={{ color: "var(--sidebar-muted-fg)" }}>Input Modalities</p>
                            <div className="space-y-1">
                                {(model.architecture?.input_modalities || []).map((mod, index) => (
                                    <span
                                        key={index}
                                        className="inline-block px-2.5 py-1 rounded-md text-xs font-medium mr-2 mb-2"
                                        style={{ background: "var(--surface-muted)", color: "var(--modal-fg)", border: "1px solid var(--modal-border)" }}
                                    >
                                        {mod}
                                    </span>
                                ))}
                            </div>
                        </div>
                        <div>
                            <p className="font-semibold mb-2.5 text-[11px] uppercase tracking-wider" style={{ color: "var(--sidebar-muted-fg)" }}>Output Modalities</p>
                            <div className="space-y-1">
                                {(model.architecture?.output_modalities || []).map((mod, index) => (
                                    <span
                                        key={index}
                                        className="inline-block px-2.5 py-1 rounded-md text-xs font-medium mr-2 mb-2"
                                        style={{ background: "var(--surface-muted)", color: "var(--modal-fg)", border: "1px solid var(--modal-border)" }}
                                    >
                                        {mod}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Pricing */}
                    {hasPricing && (
                        <div>
                            <p className="font-semibold mb-2.5 text-[11px] uppercase tracking-wider" style={{ color: "var(--sidebar-muted-fg)" }}>Pricing</p>
                            <div className="rounded-lg p-4 border" style={{ background: "var(--modal-bg-muted)", borderColor: "var(--modal-border)" }}>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {scalarPricingEntries.map(([key, value]) => (
                                        <div key={key} className="flex justify-between text-xs">
                                            <span className="font-medium" style={{ color: "var(--modal-muted-fg)" }}>{pricingLabel(key)}:</span>
                                            <span className="font-mono" style={{ color: "var(--modal-fg)" }}>{formatPricingAmount(key, value)}</span>
                                        </div>
                                    ))}
                                </div>
                                {pricingOverrides.map((tier, index) => (
                                    <div
                                        key={`tier-${tier.min_prompt_tokens ?? index}`}
                                        className="mt-4 border-t pt-3"
                                        style={{ borderColor: "var(--modal-border)" }}
                                    >
                                        <p className="text-xs font-medium mb-2" style={{ color: "var(--modal-muted-fg)" }}>
                                            {formatPricingTierLabel(tier.min_prompt_tokens)}
                                        </p>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {getTierPricingEntries(tier).map(([key, value]) => (
                                                <div key={key} className="flex justify-between text-xs">
                                                    <span className="font-medium" style={{ color: "var(--modal-muted-fg)" }}>{pricingLabel(key)}:</span>
                                                    <span className="font-mono" style={{ color: "var(--modal-fg)" }}>{formatPricingAmount(key, value)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Average Cost */}
                    {isFinite(averageCost) && averageCost > 0 && (
                        <div
                            className="rounded-lg p-4"
                            style={{ background: "color-mix(in srgb, var(--chat-accent) 10%, var(--surface-muted))", border: "1px solid color-mix(in srgb, var(--chat-accent) 28%, var(--modal-border))" }}
                        >
                            <p className="font-medium mb-1 text-sm" style={{ color: "var(--chat-accent)" }}>Average Cost per Message</p>
                            <div className="text-xl font-semibold tabular-nums" style={{ color: "var(--modal-fg)" }}>
                                {formatNGN(averageCost)}
                            </div>
                            <div className="text-sm" style={{ color: "var(--modal-muted-fg)" }}>
                                {formatUSD(getModelAverageRequestPrice(model))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
});

export default ModelSelectionDetailsModal;
