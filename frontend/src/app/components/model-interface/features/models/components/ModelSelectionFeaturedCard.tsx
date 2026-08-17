import React, { memo, useMemo } from 'react';
import { FiInfo, FiLayers } from 'react-icons/fi';
import { Model } from '@/app/components/model-interface/shared/types';
import { formatNGN, hasExtraToolingCapability, getModelDisplayName } from '@/app/components/model-interface/shared/utils';
import { ModelToggleSwitch } from '@/app/components/ChatBoxInput/ModelToggleSwitch';

const ToolsCapabilityIcon = ({ size = 10, className = '' }: { size?: number; className?: string }) => (
    <FiLayers size={size} className={className} aria-hidden strokeWidth={1.5} />
);

function getListDescription(model: Model): string {
    const text = (model.description || '').trim();
    if (text) return text;
    const subtitle = (model.subtitle || '').trim();
    if (subtitle) return subtitle;
    return '';
}

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
    const description = useMemo(() => getListDescription(model), [model]);
    const displayName = getModelDisplayName(model);

    const costLabel = useMemo(() => {
        if (!isFinite(averageCost)) return null;
        if (averageCost > 0) return `~${formatNGN(averageCost, true)} credits/msg`;
        return 'Free';
    }, [averageCost]);

    const releaseLabel =
        isSortingByReleaseDate && model.created
            ? new Date(model.created * 1000).toLocaleString(undefined, {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
            })
            : null;

    const hasFootnote = costLabel || releaseLabel;

    return (
        <div
            role="button"
            tabIndex={0}
            className={`group app-model-card w-full max-w-xl cursor-pointer ${isMobile ? 'px-3 py-2.5' : 'px-4 py-3.5'
                } ${isSelected ? 'app-model-card--selected' : ''}`}
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

                    {description ? (
                        <p
                            className={`app-model-card__desc line-clamp-2 ${isMobile ? '!text-[10px] mt-1' : 'mt-1.5'}`}
                        >
                            {description}
                        </p>
                    ) : null}

                    {hasFootnote ? (
                        <div
                            className={`app-model-card__meta flex flex-wrap items-center gap-x-2 gap-y-0.5 tabular-nums ${description ? (isMobile ? 'mt-1' : 'mt-2') : (isMobile ? 'mt-1' : 'mt-1.5')
                                } ${isMobile ? '!text-[9px]' : ''}`}
                        >
                            {costLabel ? (
                                <span
                                    className={averageCost > 0 ? 'opacity-90' : 'opacity-80'}
                                    style={averageCost > 0 ? { color: 'var(--credits-fg)' } : undefined}
                                >
                                    {costLabel}
                                </span>
                            ) : null}
                            {costLabel && releaseLabel ? (
                                <span className="opacity-30" aria-hidden>·</span>
                            ) : null}
                            {releaseLabel ? <span className="opacity-70">{releaseLabel}</span> : null}
                        </div>
                    ) : null}
                </div>

                <div
                    className={`flex shrink-0 items-center gap-0.5 pt-0.5 transition-opacity duration-150 ${isMobile || isPinned || isSelected
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
                        variant="quiet"
                    />
                </div>
            </div>
        </div>
    );
});

export default ModelSelectionFeaturedCard;
