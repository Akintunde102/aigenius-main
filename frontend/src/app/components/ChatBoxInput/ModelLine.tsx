import React from 'react';
import { Model } from './types';
import { getModelAverageRequestPrice } from '@/app/components/model-interface/shared/utils';
import { formatUSD, formatNGN } from '@/app/components/model-interface/shared/utils';

interface ModelLineProps {
    model: Model | null;
}

export const ModelLine: React.FC<ModelLineProps> = ({ model }) => {
    if (!model) {
        return (
            <div className="px-3 py-1 text-xs text-gray-400 border-b border-gray-100">
                No model selected
            </div>
        );
    }

    const getModalityIcons = (modalities: string[] = []) => {
        return modalities.map(mod => {
            if (mod.toLowerCase().includes('text')) return '📝';
            if (mod.toLowerCase().includes('image')) return '🖼️';
            if (mod.toLowerCase().includes('audio')) return '🎵';
            if (mod.toLowerCase().includes('video')) return '🎬';
            return `📄`;
        }).join(' ');
    };

    const avgUSD = model ? getModelAverageRequestPrice(model as any) : 0;

    return (
        <div className="px-3 py-1.5 text-xs border-b border-gray-100 bg-gray-50/50">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-700">{model.name}</span>
                    <span className="text-gray-400">•</span>
                    <span className="text-gray-500">Ctx: {model.context_length.toLocaleString()}</span>
                    {model.architecture?.input_modalities && (
                        <>
                            <span className="text-gray-400">•</span>
                            <span className="text-gray-500">
                                {getModalityIcons(model.architecture.input_modalities)}
                            </span>
                        </>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {isFinite(avgUSD) && avgUSD > 0 && (
                        <>
                            <span className="text-blue-700 font-medium">~<span className="text-green-700">{formatUSD(avgUSD)} · {formatNGN(avgUSD)} credits/msg</span></span>
                        </>
                    )}
                    <span className="text-gray-400 font-mono">{model.id}</span>
                </div>
            </div>
        </div>
    );
}; 