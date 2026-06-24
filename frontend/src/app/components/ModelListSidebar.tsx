import React, { useState, useMemo, useEffect } from "react";
import { FiTrash2, FiMapPin, FiInfo } from "react-icons/fi";
import { FaRegImage, FaRegFileAlt, FaRegFileAudio, FaRegFileVideo } from "react-icons/fa";
import { getPinnedModels, setPinnedModels, getDeletedModels, setDeletedModels } from '@/lib/utils/modelInterfaceUtils';

interface Model {
    id: string;
    name: string;
    description: string;
    context_length: number;
    architecture?: { modality?: string, input_modalities?: string[], output_modalities?: string[] };
    pricing?: Record<string, string>;
    [key: string]: any;
}

interface ModelListSidebarProps {
    models: Model[];
    selectedModel: Model | null;
    setSelectedModel: (model: Model) => void;
    search: string;
    setSearch: (s: string) => void;
    loading?: boolean;
    showModelList?: boolean;
    showModelDetails?: boolean;
    setShowModelList?: (v: boolean) => void;
    setShowModelDetails?: (v: boolean) => void;
    orderByCost?: 'none' | 'asc' | 'desc';
    setOrderByCost?: (order: 'none' | 'asc' | 'desc') => void;
    onShowModelDetails?: (model: Model) => void;
    hasWebSearchCapability?: (model: Model) => boolean;
}

const ModelListSidebar: React.FC<ModelListSidebarProps> = ({ models, selectedModel, setSelectedModel, search, setSearch, loading, showModelList, showModelDetails, setShowModelList, setShowModelDetails, orderByCost, setOrderByCost, onShowModelDetails, hasWebSearchCapability }) => {
    const [selectedModalities, setSelectedModalities] = useState<string[]>([]);
    const [selectedOutputModalities, setSelectedOutputModalities] = useState<string[]>([]);
    const [pinnedModels, setPinnedModelsState] = useState<string[]>([]);
    const [deletedModels, setDeletedModelsState] = useState<string[]>([]);
    const [showWebSearch, setShowWebSearch] = useState(false);

    // Collect all unique input modalities from models
    const allModalities = useMemo(() => {
        const set = new Set<string>();
        models.forEach(m => m.architecture?.input_modalities?.forEach((mod: string) => set.add(mod)));
        return Array.from(set);
    }, [models]);

    // Collect all unique output modalities from models
    const allOutputModalities = useMemo(() => {
        const set = new Set<string>();
        models.forEach(m => m.architecture?.output_modalities?.forEach((mod: string) => set.add(mod)));
        return Array.from(set);
    }, [models]);

    // Load from localStorage on mount
    useEffect(() => {
        setPinnedModelsState(getPinnedModels());
        setDeletedModelsState(getDeletedModels());
    }, []);

    // Save to localStorage when changed
    useEffect(() => {
        setPinnedModels(pinnedModels);
    }, [pinnedModels]);

    useEffect(() => {
        setDeletedModels(deletedModels);
    }, [deletedModels]);

    // Filter models by search and selected modalities (excluding deleted models)
    const filteredModels = models.filter(m => {
        // First, exclude deleted models from the main list
        if (deletedModels.includes(m.id)) return false;

        const matchesSearch =
            m.name?.toLowerCase().includes(search.toLowerCase()) ||
            m.id?.toLowerCase().includes(search.toLowerCase()) ||
            m.description?.toLowerCase().includes(search.toLowerCase()) ||
            (m.architecture?.input_modalities?.some((mod: string) => mod.toLowerCase().includes(search.toLowerCase()))) ||
            (m.architecture?.output_modalities?.some((mod: string) => mod.toLowerCase().includes(search.toLowerCase())));
        const matchesInputModality = selectedModalities.length === 0 || (m.architecture?.input_modalities?.some((mod: string) => selectedModalities.includes(mod)));
        const matchesOutputModality = selectedOutputModalities.length === 0 || (m.architecture?.output_modalities?.some((mod: string) => selectedOutputModalities.includes(mod)));
        const matchesWebSearch = !showWebSearch || (hasWebSearchCapability && hasWebSearchCapability(m));
        return matchesSearch && matchesInputModality && matchesOutputModality && matchesWebSearch;
    });

    // Tag click handlers
    const toggleModality = (mod: string) => {
        setSelectedModalities(prev => prev.includes(mod) ? prev.filter(m => m !== mod) : [...prev, mod]);
    };

    const toggleOutputModality = (mod: string) => {
        setSelectedOutputModalities(prev => prev.includes(mod) ? prev.filter(m => m !== mod) : [...prev, mod]);
    };

    // Pin/unpin model
    const togglePinModel = (id: string) => {
        const updated = pinnedModels.includes(id) ? pinnedModels.filter(m => m !== id) : [...pinnedModels, id];
        setPinnedModelsState(updated);
    };

    // Delete/restore model
    const toggleDeleteModel = (id: string) => {
        const updated = deletedModels.includes(id) ? deletedModels.filter(m => m !== id) : [...deletedModels, id];
        setDeletedModelsState(updated);
    };

    // Display average cost per request in USD and NGN when available
    function getAvgCostUSD(model: Model) {
        const val = model?.averageUserSpendPerRequest?.totalAverageCost;
        return typeof val === 'number' && isFinite(val) && val > 0 ? `$${val.toFixed(4)}` : null;
    }
    function getAvgCostNGN(model: Model) {
        const usd = model?.averageUserSpendPerRequest?.totalAverageCost;
        if (!(typeof usd === 'number' && isFinite(usd) && usd > 0)) return null;
        const naira = usd * 1400;
        return `₦${naira.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
    }

    // Helper to get modality icons
    function getModalityIcons(modalities: string[] = []) {
        return modalities.map(mod => {
            if (mod.toLowerCase().includes('text')) return <FaRegFileAlt key={mod} className="text-cyan-500" title="Text" />;
            if (mod.toLowerCase().includes('image')) return <FaRegImage key={mod} className="text-pink-500" title="Image" />;
            if (mod.toLowerCase().includes('audio')) return <FaRegFileAudio key={mod} className="text-green-500" title="Audio" />;
            if (mod.toLowerCase().includes('video')) return <FaRegFileVideo key={mod} className="text-cyan-500" title="Video" />;
            return <span key={mod} className="text-xs text-gray-400">{mod}</span>;
        });
    }

    return (
        <aside className="flex flex-col h-full w-80 border-r bg-white/95 shadow-sm sticky top-0 z-20">
            <div className="px-4 pt-4 pb-3 border-b bg-white/80 sticky top-0 z-10">
                <h2 className="text-lg font-semibold text-[#2d3a4a] mb-3 tracking-tight">Models</h2>

                {/* Search Input */}
                <div className="mb-3">
                    <input
                        type="text"
                        placeholder="Search models..."
                        className="border border-[#e6e8f9] focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100 rounded-lg px-3 py-2 w-full text-sm transition"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>

                <div className="space-y-2 px-2">
                    {(allModalities.length > 0 || allOutputModalities.length > 0) && (
                        <div>
                            <div className="flex flex-wrap gap-1 items-center">
                                {allModalities.map(mod => (
                                    <button
                                        key={mod}
                                        type="button"
                                        onClick={() => toggleModality(mod)}
                                        className={`px-2 py-0.5 rounded text-xs font-medium border transition-all duration-200 ${selectedModalities.includes(mod)
                                            ? "bg-cyan-600 text-white border-cyan-600 shadow-sm"
                                            : "bg-cyan-50 text-cyan-700 border-cyan-200 hover:bg-cyan-100 hover:border-cyan-300"
                                            }`}
                                    >
                                        {mod}
                                    </button>
                                ))}
                                {allOutputModalities.map(mod => (
                                    <button
                                        key={mod}
                                        type="button"
                                        onClick={() => toggleOutputModality(mod)}
                                        className={`px-2 py-0.5 rounded text-xs font-medium border transition-all duration-200 ${selectedOutputModalities.includes(mod)
                                            ? "bg-cyan-600 text-white border-cyan-600 shadow-sm"
                                            : "bg-cyan-50 text-cyan-700 border-cyan-200 hover:bg-cyan-100 hover:border-cyan-300"
                                            }`}
                                    >
                                        {mod}
                                    </button>
                                ))}
                                <button
                                    type="button"
                                    onClick={() => setShowWebSearch(!showWebSearch)}
                                    className={`px-2 py-0.5 rounded text-xs font-medium border transition-all duration-200 ${showWebSearch
                                        ? "bg-orange-600 text-white border-orange-600 shadow-sm"
                                        : "bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100 hover:border-orange-300"
                                        }`}
                                >
                                    {showWebSearch ? '✓ Web' : 'Web'}
                                </button>
                            </div>
                        </div>
                    )}

                    <div>
                        <select
                            value={orderByCost || 'none'}
                            onChange={e => setOrderByCost && setOrderByCost(e.target.value as 'none' | 'asc' | 'desc')}
                            className="px-2 py-1 rounded text-xs font-medium border border-green-200 bg-green-50 text-green-700 focus:border-green-400 focus:ring-2 focus:ring-green-100 transition-all duration-200 w-full"
                        >
                            <option value="none">Default</option>
                            <option value="asc">Lowest</option>
                            <option value="desc">Highest</option>
                        </select>
                    </div>
                </div>
            </div>
            {/* Loader above the model list */}
            {loading && (
                <div className="flex justify-center items-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-cyan-500"></div>
                </div>
            )}
            <div className="flex-1 overflow-y-auto px-2 py-2 min-h-0">
                <ul className="space-y-1">
                    {filteredModels.length === 0 && (
                        <div className="text-gray-400 text-center py-8">No models found.</div>
                    )}
                    {filteredModels.map(model => (
                        <li
                            key={model.id}
                            className={`group p-3 rounded-lg cursor-pointer border transition-all duration-100 flex flex-col relative ${selectedModel?.id === model.id
                                ? "bg-cyan-50 border-cyan-400 text-cyan-900 shadow"
                                : pinnedModels.includes(model.id)
                                    ? "bg-yellow-50 border-yellow-400 text-yellow-900"
                                    : "bg-white border-transparent hover:bg-[#f3f6fa] hover:border-cyan-200"}`}
                            onClick={() => setSelectedModel(model)}
                        >
                            <div className="flex items-center justify-between">
                                <div className="truncate font-medium text-sm group-hover:text-cyan-700">
                                    {model.name}
                                </div>
                                <div className={`flex items-center gap-2 ml-2 ${pinnedModels.includes(model.id) ? '' : 'opacity-0 group-hover:opacity-100 transition-opacity'}`} onClick={e => e.stopPropagation()}>
                                    <button
                                        title={pinnedModels.includes(model.id) ? "Unpin model" : "Pin model"}
                                        className={`text-yellow-500 hover:text-yellow-700 ${pinnedModels.includes(model.id) ? 'font-bold' : 'opacity-60 hover:opacity-100'}`}
                                        onClick={() => togglePinModel(model.id)}
                                    >
                                        <FiMapPin size={16} />
                                    </button>
                                    <button
                                        title="Delete model"
                                        className="text-gray-400 hover:text-red-500"
                                        onClick={() => toggleDeleteModel(model.id)}
                                    >
                                        <FiTrash2 size={16} />
                                    </button>
                                    <button
                                        title="View model details"
                                        className="text-cyan-400 hover:text-cyan-700"
                                        onClick={e => { e.stopPropagation(); onShowModelDetails && onShowModelDetails(model); }}
                                    >
                                        <FiInfo size={16} />
                                    </button>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                                {getModalityIcons(model.architecture?.input_modalities)}
                                {getModalityIcons(model.architecture?.output_modalities)}
                            </div>
                            <div className="text-xs text-cyan-700 mt-1 font-semibold">
                                {getAvgCostUSD(model) ? `~${getAvgCostUSD(model)} · ${getAvgCostNGN(model)} credits/msg` : 'No price info'}
                            </div>
                        </li>
                    ))}
                </ul>
                {/* Legend of all modalities (unclickable) */}
                <div className="flex flex-wrap gap-2 mt-4 px-2">
                    {allModalities.map(mod => (
                        <span
                            key={mod}
                            className="px-2 py-0.5 rounded text-[11px] font-semibold border border-cyan-200 bg-cyan-50 text-cyan-700 uppercase"
                        >
                            {mod}
                        </span>
                    ))}
                </div>
                {/* Saved Pins and Deleted Models */}
                {(pinnedModels.length > 0 || deletedModels.length > 0) && (
                    <div className="mt-6 px-2 pb-4">
                        {pinnedModels.length > 0 && (
                            <div className="mb-3">
                                <div className="text-xs font-bold text-yellow-700 mb-1">Pinned Models</div>
                                <ul className="space-y-1">
                                    {pinnedModels.map(id => {
                                        const model = models.find(m => m.id === id);
                                        if (!model) return null;
                                        return (
                                            <li key={id} className="flex items-center gap-2 text-sm bg-yellow-50 border border-yellow-200 rounded px-2 py-1">
                                                <span className="truncate">{model.name || model.id}</span>
                                                <button
                                                    className="text-yellow-500 hover:text-yellow-700 ml-auto"
                                                    title="Unpin"
                                                    onClick={() => togglePinModel(id)}
                                                >
                                                    <FiMapPin size={14} />
                                                </button>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </div>
                        )}
                        {deletedModels.length > 0 && (
                            <div>
                                <div className="text-xs font-bold text-red-700 mb-1">Deleted Models</div>
                                <ul className="space-y-1">
                                    {deletedModels.map(id => {
                                        const model = models.find(m => m.id === id);
                                        if (!model) return null;
                                        return (
                                            <li key={id} className="flex items-center gap-2 text-sm bg-red-50 border border-red-200 rounded px-2 py-1">
                                                <span className="truncate">{model.name || model.id}</span>
                                                <button
                                                    className="text-red-500 hover:text-red-700 ml-auto"
                                                    title="Restore"
                                                    onClick={() => toggleDeleteModel(id)}
                                                >
                                                    Restore
                                                </button>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </aside>
    );
};

export default ModelListSidebar; 