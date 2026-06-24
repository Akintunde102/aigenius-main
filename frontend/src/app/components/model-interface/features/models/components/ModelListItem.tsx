import React, { useMemo } from 'react';
import { FiTrash2, FiMapPin, FiInfo } from "react-icons/fi";
import { FaRegImage, FaRegFileAlt, FaRegFileAudio, FaRegFileVideo } from "react-icons/fa";
import { Model } from '@/app/components/model-interface/shared/types';
import { getProvider, getProviderLabel } from '@/app/components/model-interface/shared/utils';

interface ModelListItemProps {
    model: Model;
    isSelected: boolean;
    isPinned: boolean;
    isDeleted: boolean;
    onSelect: (model: Model) => void;
    onPin: (id: string) => void;
    onDelete: (id: string) => void;
    onShowDetails: (model: Model) => void;
    hasWebSearchCapability?: (model: Model) => boolean;
    showNaira?: boolean;
    isSortingByReleaseDate?: boolean;
}

export const ModelListItem: React.FC<ModelListItemProps> = React.memo(({
    model,
    isSelected,
    isPinned,
    isDeleted,
    onSelect,
    onPin,
    onDelete,
    onShowDetails,
    hasWebSearchCapability,
    showNaira = false,
    isSortingByReleaseDate = false
}) => {
    const providerLabel = useMemo(() => getProviderLabel(getProvider(model.id)), [model.id]);

    // Helper to get price in naira
    const USD_TO_NGN = 1400;
    const getNairaPrice = (model: Model) => {
        if (!model.pricing) return null;
        const price = model.pricing.prompt || Object.values(model.pricing)[0];
        if (!price) return null;
        const num = parseFloat(price);
        if (isNaN(num)) return null;
        return `₦${(num * USD_TO_NGN).toLocaleString()}`;
    };

    // Helper to get modality icons
    const getModalityIcons = (modalities: string[] = []) => {
        return modalities.filter(mod => (mod || '').toLowerCase() !== 'text').map(mod => {
            if (mod.toLowerCase().includes('image')) return <FaRegImage key={mod} className="text-pink-500" title="Image" />;
            if (mod.toLowerCase().includes('audio')) return <FaRegFileAudio key={mod} className="text-green-500" title="Audio" />;
            if (mod.toLowerCase().includes('video')) return <FaRegFileVideo key={mod} className="text-cyan-500" title="Video" />;
            return <span key={mod} className="text-xs text-gray-400">{mod}</span>;
        });
    };

    return (
        <div
            className={`group relative p-3 rounded-lg border transition-all duration-200 cursor-pointer ${isSelected
                ? "bg-blue-50 border-blue-300 shadow-sm"
                : "bg-white border-gray-200 hover:bg-gray-50 hover:border-gray-300"
                } ${isDeleted ? "opacity-50" : ""}`}
            onClick={() => onSelect(model)}
        >
            {isSortingByReleaseDate && model.created && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 z-10">
                    <div className="bg-white/80 backdrop-blur-sm text-slate-500 text-[9px] font-medium px-2 py-0.5 rounded-b-xl border-x border-b border-gray-200/50 shadow-sm flex items-center gap-1 whitespace-nowrap">
                        <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-70">
                            <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                        </svg>
                        {new Date(model.created * 1000).toLocaleString(undefined, { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })}
                    </div>
                </div>
            )}
            {/* Pin indicator */}
            {isPinned && (
                <div className="absolute top-2 right-2">
                    <FiMapPin className="text-blue-500" size={14} />
                </div>
            )}

            {/* Model header */}
            <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                        <h3 className="font-medium text-sm text-gray-900 truncate">{model.name}</h3>
                        <span className="text-[9px] px-1 rounded bg-gray-100 text-gray-500 font-bold uppercase tracking-wider">{providerLabel}</span>
                    </div>
                    <p className="text-xs text-gray-500 truncate">{model.id}</p>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onShowDetails(model);
                        }}
                        className="p-1 text-gray-400 hover:text-blue-500 transition-colors"
                        title="Model details"
                    >
                        <FiInfo size={12} />
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onPin(model.id);
                        }}
                        className={`p-1 transition-colors ${isPinned ? "text-blue-500" : "text-gray-400 hover:text-blue-500"
                            }`}
                        title={isPinned ? "Unpin model" : "Pin model"}
                    >
                        <FiMapPin size={12} />
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete(model.id);
                        }}
                        className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                        title={isDeleted ? "Restore model" : "Delete model"}
                    >
                        <FiTrash2 size={12} />
                    </button>
                </div>
            </div>

            {/* Model description */}
            {model.description && (
                <p className="text-sm text-gray-600 mb-2 line-clamp-2">{model.description}</p>
            )}

            {/* Modalities */}
            <div className="flex items-center gap-1 mb-2">
                {getModalityIcons(model.architecture?.input_modalities)}
                {model.architecture?.output_modalities && model.architecture.output_modalities.length > 0 && (
                    <>
                        <span className="text-gray-300">→</span>
                        {getModalityIcons(model.architecture.output_modalities)}
                    </>
                )}
                {hasWebSearchCapability && hasWebSearchCapability(model) && (
                    <span className="text-xs bg-orange-100 text-orange-700 px-1 py-0.5 rounded">Web</span>
                )}
            </div>

            {/* Context length and pricing */}
            <div className="flex items-center justify-between text-xs text-gray-500">
                <span>{model.context_length?.toLocaleString()} tokens</span>
                {model.pricing && (
                    <span className="font-medium">
                        {showNaira ? getNairaPrice(model) : (
                            isFinite(parseFloat(Object.values(model.pricing)[0]))
                                ? `$${(parseFloat(Object.values(model.pricing)[0]) * 1000000).toFixed(2)}/1M`
                                : `$${Object.values(model.pricing)[0]}`
                        )}
                    </span>
                )}
            </div>
        </div>
    );
});

ModelListItem.displayName = 'ModelListItem'; 