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
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden">
                {/* Header */}
                <div className="flex justify-between items-center p-4 border-b border-gray-200">
                    <h3 className="text-lg font-bold text-gray-900">{getModelDisplayName(model)}</h3>
                    <button
                        className="text-gray-400 hover:text-gray-600 transition-colors duration-200 p-1"
                        onClick={onClose}
                        title="Close details"
                    >
                        <FiX size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
                    {/* Basic Info */}
                    <div className="mb-6">
                        {model.subtitle && (
                            <p className="text-gray-600 text-lg mb-4">{model.subtitle}</p>
                        )}
                        {model.description && (
                            <p className="text-gray-700 mb-4">{model.description}</p>
                        )}
                    </div>

                    {/* Modalities */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        <div>
                            <h4 className="font-semibold text-gray-900 mb-2">Input Modalities</h4>
                            <div className="space-y-1">
                                {(model.architecture?.input_modalities || []).map((mod, index) => (
                                    <span key={index} className="inline-block px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm mr-2 mb-2">
                                        {mod}
                                    </span>
                                ))}
                            </div>
                        </div>
                        <div>
                            <h4 className="font-semibold text-gray-900 mb-2">Output Modalities</h4>
                            <div className="space-y-1">
                                {(model.architecture?.output_modalities || []).map((mod, index) => (
                                    <span key={index} className="inline-block px-2 py-1 bg-cyan-100 text-cyan-700 rounded text-sm mr-2 mb-2">
                                        {mod}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Pricing */}
                    {model.pricing && Object.keys(model.pricing).length > 0 && (
                        <div className="mb-6">
                            <h4 className="font-semibold text-gray-900 mb-2">Pricing</h4>
                            <div className="bg-gray-50 rounded-lg p-4">
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
                                            <div key={key} className="flex justify-between">
                                                <span className="font-medium text-gray-700">{label}:</span>
                                                <span className="font-mono text-gray-900">{displayValue}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Average Cost */}
                    {isFinite(averageCost) && averageCost > 0 && (
                        <div className="bg-green-50 rounded-lg p-4">
                            <h4 className="font-semibold text-green-900 mb-2">Average Cost per Message</h4>
                            <div className="text-2xl font-bold text-green-700">
                                {formatNGN(averageCost)} credits
                            </div>
                            <div className="text-sm text-green-600">
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
