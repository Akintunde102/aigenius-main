import React, { memo, useMemo } from 'react';
import { FiInfo, FiLayers } from 'react-icons/fi';
import { Model } from '@/app/components/model-interface/shared/types';
import { hasExtraToolingCapability, getModelDisplayName } from '@/app/components/model-interface/shared/utils';
import { ModelToggleSwitch } from '@/app/components/ChatBoxInput/ModelToggleSwitch';
import { buildModelCardSlots } from '../utils/modelMetaPills.utils';

const ToolsCapabilityIcon = ({ size = 7, className = '' }: { size?: number; className?: string }) => (
    <FiLayers size={size} className={className} aria-hidden strokeWidth={1.25} />
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
}: ModelSelectionFeaturedCardProps) {
    const supportsTools = hasExtraToolingCapability(model);
    const displayName = getModelDisplayName(model);
    const slots = useMemo(
        () => buildModelCardSlots(model, averageCost),
        [model, averageCost],
    );

    return (
        <div
            role="button"
            tabIndex={0}
            className={`group app-model-card w-full max-w-xl cursor-pointer px-2.5 py-1.5 ${isSelected ? 'app-model-card--selected' : ''}`}
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
            {supportsTools && (
                <span
                    className="app-model-card__tools-hint"
                    title="Extra tooling (Gmail, Keep, etc.)"
                >
                    <ToolsCapabilityIcon size={7} />
                </span>
            )}

            <div className="app-model-card__layout">
                <div className="min-w-0 flex-1">
                    <span className="block truncate app-model-card__title">
                        {displayName}
                    </span>
                    {slots.cost && (
                        <span className="block truncate app-model-card__cost">
                            {slots.cost.label}
                        </span>
                    )}
                </div>

                <div className="app-model-card__actions">
                    {onShowDetails && (
                        <button
                            type="button"
                            className={`flex shrink-0 items-center justify-center rounded-sm text-[var(--sidebar-muted-fg)] opacity-40 transition-colors hover:opacity-80 hover:text-[var(--sidebar-fg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--chat-accent)] focus-visible:ring-offset-1 focus-visible:opacity-100 ${isMobile ? 'p-0.5' : 'p-1'
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
