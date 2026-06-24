import React from 'react';
import { FiGlobe, FiSearch } from 'react-icons/fi';
import { FaRegImage } from 'react-icons/fa';

interface ModelFiltersProps {
    allModalities: string[];
    selectedModalities: string[];
    toggleModality: (mod: string) => void;
    allOutputModalities: string[];
    selectedOutputModalities: string[];
    toggleOutputModality: (mod: string) => void;
    showWebSearch: boolean;
    setShowWebSearch: (show: boolean) => void;
    orderByCost: 'none' | 'asc' | 'desc';
    setOrderByCost: (order: 'none' | 'asc' | 'desc') => void;
    isMobile?: boolean;
    imageFilterOnly?: boolean;
    setImageFilterOnly?: (v: boolean | ((prev: boolean) => boolean)) => void;
}

export const ModelFilters: React.FC<ModelFiltersProps> = React.memo(({
    showWebSearch,
    setShowWebSearch,
    orderByCost,
    setOrderByCost,
    isMobile = false,
    imageFilterOnly = false,
    setImageFilterOnly,
}) => {
    return (
        <div className={`${isMobile ? 'space-y-1.5' : 'space-y-2'}`}>
            {/* Image filter (icon only) & Web Search */}
            <div>
                <div className={`flex flex-wrap items-center ${isMobile ? 'gap-0.5' : 'gap-1'}`}>
                    {setImageFilterOnly && (
                        <button
                            type="button"
                            onClick={() => setImageFilterOnly(prev => !prev)}
                            title={imageFilterOnly ? 'Image output – on' : 'Image output – show only models that can generate images'}
                            className={`inline-flex items-center justify-center rounded-md border transition-colors flex-shrink-0 ${isMobile ? 'w-7 h-7' : 'w-8 h-8'} ${imageFilterOnly ? 'bg-pink-100 text-pink-700 border-pink-300' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                            aria-label="Filter by image output"
                        >
                            <FaRegImage size={isMobile ? 12 : 14} />
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={() => setShowWebSearch(!showWebSearch)}
                        className={`rounded-md border transition-all duration-200 font-medium cursor-pointer shadow-sm hover:shadow inline-flex items-center gap-0.5 ${isMobile ? 'p-1' : 'p-1'} ${showWebSearch ? "bg-orange-600 text-white border-orange-600" : "bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100 hover:border-orange-300"}`}
                        title={showWebSearch ? 'Web search (on)' : 'Web search – filter by models with web search'}
                    >
                        <FiSearch size={isMobile ? 9 : 11} className="opacity-90" title="Search" />
                        <FiGlobe size={isMobile ? 10 : 12} title="Web" />
                    </button>
                </div>
            </div>

            {/* Cost Ordering */}
            <div>
                <select
                    value={orderByCost}
                    onChange={e => setOrderByCost(e.target.value as 'none' | 'asc' | 'desc')}
                    className={`rounded-md border border-green-200 bg-green-50 text-green-700 focus:border-green-400 focus:ring-2 focus:ring-green-100 transition-all duration-200 w-full font-medium cursor-pointer shadow-sm hover:shadow ${isMobile
                            ? 'px-1.5 py-0.5 text-[10px]'
                            : 'px-2 py-0.5 text-[11px]'
                        }`}
                >
                    <option value="none">Default</option>
                    <option value="asc">Lowest</option>
                    <option value="desc">Highest</option>
                </select>
            </div>
        </div>
    );
});

ModelFilters.displayName = 'ModelFilters'; 