import React, { memo } from 'react';
import { Model } from '@/app/components/model-interface/shared/types';

// Recently used models row
type ModelSelectionRecentlyPickedProps = {
    recentModels: Model[];
    selectedModel: Model | null;
    onPick: (model: Model) => void;
    isMobile?: boolean;
};

const ModelSelectionRecentlyPicked = memo(function RecentlyPicked({
    recentModels,
    selectedModel,
    onPick,
    isMobile = false,
}: ModelSelectionRecentlyPickedProps) {
    if (!recentModels || recentModels.length === 0) return null;
    return (
        <div className={`${isMobile ? 'px-2 pt-3 pb-2' : 'px-4 pt-4 pb-2'}`}>
            <div className={`font-semibold text-blue-700 mb-2 ${isMobile ? 'text-xs' : 'text-sm'}`}>Recently Picked</div>
            <div className={`flex flex-row flex-wrap ${isMobile ? 'gap-1.5' : 'gap-2'}`}>
                {recentModels.map((model) => (
                    <div
                        key={model.id}
                        className={`flex items-center border rounded-lg cursor-pointer transition-all duration-150 hover:shadow-md min-w-0 ${selectedModel?.id === model.id
                            ? 'bg-blue-50 border-blue-400 shadow'
                            : 'bg-white border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                            } ${isMobile ? 'px-2 py-1' : 'p-2'}`}
                        style={isMobile ?
                            { fontSize: 11, gap: 4, minWidth: 80 } :
                            { fontSize: 13, gap: 8, minWidth: 120 }
                        }
                        onClick={() => onPick(model)}
                    >
                        <span className="font-bold truncate">{model.name}</span>
                    </div>
                ))}
            </div>
        </div>
    );
});

export default ModelSelectionRecentlyPicked;
