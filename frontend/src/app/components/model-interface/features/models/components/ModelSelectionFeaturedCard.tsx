import React, { memo } from 'react';
import { FiInfo, FiLayers } from 'react-icons/fi';
import { Model } from '@/app/components/model-interface/shared/types';
import { hasExtraToolingCapability, getModelDisplayName } from '@/app/components/model-interface/shared/utils';
import { ModelToggleSwitch } from '@/app/components/ChatBoxInput/ModelToggleSwitch';
import { ModelMetaPills } from './ModelMetaPills';

const ToolsCapabilityIcon = ({ size = 10, className = '' }: { size?: number; className?: string }) => (
    <FiLayers size={size} className={className} aria-hidden strokeWidth={1.5} />
);

type ModelSelectionFeaturedCardProps = {
    model: Model;
    isPinned: boolean;
    onTogglePin: () => void;
    onSelect: () => void;
    averageCost: number;
    isSelected: boolean;
    onShowDetails?: () => void;
    isMobile?: boolean;
    isSortingByReleaseDate?: boolean;
};

const ModelSelectionFeaturedCard = memo(function ModelSelectionListRow({
    model,
    isPinned,
    onTogglePin,
    onSelect,
    averageCost,
    isSelected,
    onShowDetails,
    isMobile = false,
    isSortingByReleaseDate = false,
}: ModelSelectionFeaturedCardProps) {
    const supportsTools = hasExtraToolingCapability(model);
    const displayName = getModelDisplayName(model);

    const isHighlighted = isSelected || isPinned;

    return (
        <div
            role="button"
            tabIndex={0}
            className={`group app-model-card w-full max-w-xl cursor-pointer ${isMobile ? 'px-3 py-2.5' : 'px-4 py-3.5'
                } ${isHighlighted ? 'app-model-card--selected' : ''}`}
            onClick={() => {
                onSelect();
                try {
                    document.getElementById('chat-input')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                } catch {
                    /* ignore */
                }
            }}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelect();
                }
            }}
        >
            <div className="flex min-w-0 items-start gap-3">
                <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 items-center gap-1.5">
                        <span
                            className={`truncate app-model-card__title ${isMobile ? '!text-[11px]' : ''}`}
                        >
                            {displayName}
                        </span>
                        {supportsTools && (
                            <span
                                className="shrink-0 text-[var(--modal-muted-fg)] opacity-35"
                                title="Extra tooling (Gmail, Keep, etc.)"
                            >
                                <ToolsCapabilityIcon size={isMobile ? 9 : 10} />
                            </span>
                        )}
                    </div>

                    <ModelMetaPills
                        model={model}
                        averageCost={averageCost}
                        isMobile={isMobile}
                        highlightReleaseDate={isSortingByReleaseDate}
                    />
                </div>

                <div
                    className={`flex shrink-0 items-center gap-0.5 pt-0.5 transition-opacity duration-150 ${isMobile || isHighlighted
                        ? 'opacity-100'
                        : 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100'
                        }`}
                >
                    {onShowDetails && (
                        <button
                            type="button"
                            className={`flex shrink-0 items-center justify-center rounded-sm text-[var(--modal-muted-fg)] opacity-40 transition-colors hover:opacity-80 hover:text-[var(--modal-fg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--chat-accent)] focus-visible:ring-offset-1 focus-visible:opacity-100 ${isMobile ? 'p-0.5' : 'p-1'
                                }`}
                            onClick={(e) => {
                                e.stopPropagation();
                                onShowDetails();
                            }}
                            title="More info"
                        >
                            <FiInfo size={isMobile ? 11 : 12} strokeWidth={1.5} />
                        </button>
                    )}
                    <ModelToggleSwitch
                        checked={isPinned}
                        onChange={onTogglePin}
                        label={isPinned ? `Remove ${displayName} from quick picks` : `Add ${displayName} to quick picks`}
                        size="xs"
                        variant={isPinned ? "default" : "quiet"}
                    />
                </div>
            </div>
        </div>
    );
});

export default ModelSelectionFeaturedCard;
