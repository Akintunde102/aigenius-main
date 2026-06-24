import React, { memo, useMemo, useState } from 'react';
import { FiBookmark, FiInfo } from 'react-icons/fi';
import { Model } from '@/app/components/model-interface/shared/types';
import { formatNGN } from '@/app/components/model-interface/shared/utils';

// Model list row for search tab
type ModelSelectionListItemProps = {
    model: Model;
    isPinned: boolean;
    onTogglePin: () => void;
    onSelect: () => void;
    isExpanded: boolean;
    onToggleExpand: () => void;
    averageCost: number;
    isSelected: boolean;
    isMobile?: boolean;
    isSortingByReleaseDate?: boolean;
};

const ModelSelectionListItem = memo(function ModelListItem({
    model,
    isPinned,
    onTogglePin,
    onSelect,
    isExpanded,
    onToggleExpand,
    averageCost,
    isSelected,
    isMobile = false,
    isSortingByReleaseDate = false,
}: ModelSelectionListItemProps) {
    const inputMods = useMemo(() => {
        const mods = (model.architecture?.input_modalities || []).filter((mod: string) => (mod || '').toLowerCase() !== 'text');
        const audio = mods.find((m: string) => /audio/i.test(m));
        return audio ? [audio] : mods.slice(0, 1);
    }, [model]);

    const outputMods = useMemo(() => {
        return (model.architecture?.output_modalities || [])
            .filter((mod: string) => (mod || '').toLowerCase() !== 'text')
            .slice(0, 1);
    }, [model]);

    return (
        <div className={`flex flex-col border rounded-lg bg-white cursor-pointer hover:shadow-md transition-shadow relative ${isMobile ? 'gap-1 p-2' : 'gap-2 p-3'
            }`}>
            {isSortingByReleaseDate && model.created && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 z-10">
                    <div className="bg-white/80 backdrop-blur-sm text-slate-500 text-[10px] font-medium px-2.5 py-0.5 rounded-b-xl border-x border-b border-gray-200/50 shadow-sm flex items-center gap-1.5 whitespace-nowrap">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-70">
                            <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                        </svg>
                        {new Date(model.created * 1000).toLocaleString(undefined, { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })}
                    </div>
                </div>
            )}
            <div className={`flex items-start ${isMobile ? 'gap-1.5' : 'gap-2'}`}>
                <button
                    className={`flex items-center justify-center border rounded-lg transition-all duration-150 ${isMobile ? 'p-1' : 'p-2'
                        } ${isPinned ? 'border-yellow-300 bg-yellow-50' : 'border-gray-200 bg-white'}`}
                    onClick={(e) => {
                        e.stopPropagation();
                        onTogglePin();
                    }}
                    title={isPinned ? 'Unpin model' : 'Pin model'}
                >
                    <FiBookmark size={isMobile ? 14 : 18} fill={isPinned ? '#facc15' : 'none'} />
                </button>
                <div className="flex-1 min-w-0" onClick={onSelect}>
                    <div className="flex items-center gap-2 min-w-0">
                        <span className={`font-bold truncate ${isMobile ? 'text-[11px]' : 'text-xs'}`}>{model.name}</span>
                        {isSelected && <span className="text-blue-600 font-semibold">✓</span>}
                    </div>
                    {model.subtitle && <div className={`text-gray-500 truncate ${isMobile ? 'text-[10px]' : 'text-xs'}`}>{model.subtitle}</div>}
                    <div className={`flex items-center gap-2 flex-wrap ${isMobile ? 'mt-0.5 text-[10px]' : 'mt-1 text-xs'}`}>
                        {isFinite(averageCost) && averageCost > 0 && (
                            <span className="text-blue-700">
                                ~<span className="text-green-700">{formatNGN(averageCost, true)} credits/msg</span>
                            </span>
                        )}
                        {inputMods.map((mod: string) => (
                            <span key={mod} className={`bg-blue-100 text-blue-700 rounded font-medium ${isMobile ? 'px-1 py-0.5 text-[9px]' : 'px-1 py-0.5'
                                }`}>
                                {mod}
                            </span>
                        ))}
                        {outputMods.map((mod: string) => (
                            <span key={mod} className={`bg-cyan-100 text-cyan-700 rounded font-medium ${isMobile ? 'px-1 py-0.5 text-[9px]' : 'px-1 py-0.5'
                                }`}>
                                {mod}
                            </span>
                        ))}
                    </div>
                </div>
                <button
                    className={`flex items-center justify-center border border-gray-200 bg-white rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-all duration-150 ${isMobile ? 'p-1' : 'p-2'
                        }`}
                    onClick={(e) => {
                        e.stopPropagation();
                        onToggleExpand();
                    }}
                    title="More info"
                >
                    <FiInfo size={isMobile ? 14 : 18} />
                </button>
            </div>
            {isExpanded && (
                <div className={`text-gray-800 bg-gray-50 border border-gray-200 rounded-md ${isMobile ? 'text-[11px] p-2' : 'text-sm p-3'
                    }`}>
                    <div className={isMobile ? 'mb-1' : 'mb-2'}>
                        <span className="font-semibold">Description:</span> {model.description || 'No description.'}
                    </div>
                    <div className={isMobile ? 'mb-0.5' : 'mb-1'}>
                        <span className="font-semibold">Input:</span>{' '}
                        {model.architecture?.input_modalities?.filter((mod: string) => (mod || '').toLowerCase() !== 'text').join(', ') || 'N/A'}
                    </div>
                    <div className={isMobile ? 'mb-1' : 'mb-2'}>
                        <span className="font-semibold">Output:</span>{' '}
                        {model.architecture?.output_modalities?.filter((mod: string) => (mod || '').toLowerCase() !== 'text').join(', ') || 'N/A'}
                    </div>
                    <div>
                        <span className="font-semibold">Pricing:</span>
                        {model.pricing ? (
                            <ul className={isMobile ? 'ml-2 list-disc' : 'ml-4 list-disc'}>
                                {Object.entries(model.pricing).map(([k, v]) => {
                                    const numV = parseFloat(String(v));
                                    const key = k.toLowerCase();
                                    const isTokenBased = key === 'prompt' || key === 'completion' || key.includes('cache');

                                    const multiplier = isTokenBased ? 1000000 : 1;
                                    let unit = isTokenBased ? '/ 1M tokens' : '';

                                    if (key === 'image') unit = '/ image';
                                    if (key === 'web_search') unit = '/ search';
                                    if (key === 'request') unit = '/ request';
                                    if (key === 'audio') unit = '/ second';

                                    const displayV = isNaN(numV) ? v : `$${(numV * multiplier).toFixed(key === 'web_search' || key === 'request' || key === 'image' ? 3 : 2)} ${unit}`;
                                    const label = k.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

                                    return (
                                        <li key={k} className={`font-mono ${isMobile ? 'text-[10px]' : 'text-[13px]'}`}>
                                            {label}: {displayV}
                                        </li>
                                    );
                                })}
                            </ul>
                        ) : (
                            <span className="text-gray-500"> No pricing info.</span>
                        )}
                    </div>
                    {isFinite(averageCost) && averageCost > 0 && (
                        <div className={`text-blue-700 font-semibold ${isMobile ? 'text-[10px] mt-1' : 'text-xs mt-2'
                            }`}>
                            Avg. price (est. 800 tokens): {formatNGN(averageCost)} USD · {formatNGN(averageCost)} NGN
                        </div>
                    )}
                </div>
            )}
        </div>
    );
});

export default ModelSelectionListItem;
