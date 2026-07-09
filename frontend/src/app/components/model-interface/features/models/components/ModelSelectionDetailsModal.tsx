import React, { memo } from 'react';
import { FiX } from 'react-icons/fi';
import { Model } from '@/app/components/model-interface/shared/types';
import { formatUSD, formatNGN, getModelDisplayName } from '@/app/components/model-interface/shared/utils';

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
                <div className="flex justify-between items-center p-4 border-b" style={{ borderColor: "var(--modal-border)" }}>
                    <h3 className="text-lg font-bold">{getModelDisplayName(model)}</h3>
                    <button
                        className="hover:text-red-500 transition-colors duration-200 p-1"
                        style={{ color: "var(--modal-muted-fg)" }}
                        onClick={onClose}
                        title="Close details"
                    >
                        <FiX size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)] space-y-6">
                    {/* Basic Info */}
                    <div>
                        {model.subtitle && (
                            <p className="text-lg mb-4" style={{ color: "var(--modal-fg)", opacity: 0.85 }}>{model.subtitle}</p>
                        )}
                        {model.description && (
                            <p className="mb-4 text-sm leading-relaxed" style={{ color: "var(--modal-muted-fg)" }}>{model.description}</p>
                        )}
                    </div>

                    {/* Modalities */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <h4 className="font-semibold mb-2 text-sm" style={{ color: "var(--modal-fg)" }}>Input Modalities</h4>
                            <div className="space-y-1">
                                {(model.architecture?.input_modalities || []).map((mod, index) => (
                                    <span key={index} className="inline-block px-2.5 py-1 bg-blue-500/10 text-blue-500 rounded text-xs mr-2 mb-2 border border-blue-500/25">
                                        {mod}
                                    </span>
                                ))}
                            </div>
                        </div>
                        <div>
                            <h4 className="font-semibold mb-2 text-sm" style={{ color: "var(--modal-fg)" }}>Output Modalities</h4>
                            <div className="space-y-1">
                                {(model.architecture?.output_modalities || []).map((mod, index) => (
                                    <span key={index} className="inline-block px-2.5 py-1 bg-cyan-500/10 text-cyan-500 rounded text-xs mr-2 mb-2 border border-cyan-500/25">
                                        {mod}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Pricing */}
                    {model.pricing && Object.keys(model.pricing).length > 0 && (
                        <div>
                            <h4 className="font-semibold mb-2 text-sm" style={{ color: "var(--modal-fg)" }}>Pricing</h4>
                            <div className="rounded-lg p-4 border" style={{ background: "var(--modal-bg-muted)", borderColor: "var(--modal-border)" }}>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {Object.entries(model.pricing).map(([key, value]) => {
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
                                        const label = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

                                        return (
                                            <div key={key} className="flex justify-between text-xs">
                                                <span className="font-medium" style={{ color: "var(--modal-muted-fg)" }}>{label}:</span>
                                                <span className="font-mono" style={{ color: "var(--modal-fg)" }}>{displayValue}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Average Cost */}
                    {isFinite(averageCost) && averageCost > 0 && (
                        <div className="rounded-lg p-4 border border-green-500/20 bg-green-500/10">
                            <h4 className="font-semibold text-green-600 dark:text-green-400 mb-1 text-sm">Average Cost per Message</h4>
                            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                                {formatNGN(averageCost)} credits
                            </div>
                            <div className="text-sm opacity-80 text-green-600 dark:text-green-400">
                                {formatUSD(averageCost)}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
});

export default ModelSelectionDetailsModal;
