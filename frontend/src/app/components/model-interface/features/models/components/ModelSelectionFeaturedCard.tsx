import React, { memo, useMemo } from 'react';
import { FiInfo, FiLayers } from 'react-icons/fi';
import { Model } from '@/app/components/model-interface/shared/types';
import { formatNGN, hasExtraToolingCapability, getModelDisplayName } from '@/app/components/model-interface/shared/utils';
import { ModelToggleSwitch } from '@/app/components/ChatBoxInput/ModelToggleSwitch';

const ToolsCapabilityIcon = ({ size = 12, className = '' }: { size?: number; className?: string }) => (
    <FiLayers size={size} className={className} />
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

    const nameClass = `truncate font-medium leading-tight text-gray-900 dark:text-zinc-100 ${isMobile ? 'text-[9px]' : 'text-[13px]'
        }`;
    const descClass = `line-clamp-2 leading-snug text-gray-500 dark:text-zinc-400 ${isMobile ? 'text-[8px] mt-1' : 'text-[11px] mt-1'
        }`;
    const costClass = `whitespace-nowrap ${isMobile ? 'text-[8px]' : 'text-[11px]'}`;

    const costLabel = useMemo(() => {
        if (!isFinite(averageCost)) return null;
        if (averageCost > 0) return `~${formatNGN(averageCost, true)} credits/msg`;
        return 'Free';
    }, [averageCost]);

    return (
        <div
            role="button"
            tabIndex={0}
            className={`group flex w-full max-w-xl cursor-pointer items-start gap-2.5 rounded-lg border bg-white shadow-sm transition-all hover:shadow dark:bg-zinc-900/80 ${isMobile ? 'px-2.5 py-2' : 'px-3 py-2.5'
                } ${isSelected
                    ? 'border-[color:var(--chat-accent)] ring-1 ring-[color:var(--chat-accent)]/25'
                    : 'border-gray-200 hover:border-gray-300 dark:border-zinc-700 dark:hover:border-zinc-600'
                }`}
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
            <div className="min-w-0 flex-1">
                <div className="flex min-w-0 items-center gap-1.5">
                    <span className={nameClass}>{displayName}</span>
                    {isSelected && (
                        <span
                            className={`shrink-0 font-medium ${isMobile ? 'text-[8px]' : 'text-[11px]'}`}
                            style={{ color: 'var(--chat-accent)' }}
                        >
                            ✓
                        </span>
                    )}
                    {supportsTools && (
                        <span
                            className="shrink-0 text-cyan-600 dark:text-cyan-400"
                            title="Extra tooling (Gmail, Keep, etc.)"
                        >
                            <ToolsCapabilityIcon size={isMobile ? 10 : 12} />
                        </span>
                    )}
                </div>
                {description ? <p className={descClass}>{description}</p> : null}
                {isSortingByReleaseDate && model.created && (
                    <p className={`mt-0.5 text-gray-400 dark:text-zinc-500 ${isMobile ? 'text-[8px]' : 'text-[10px]'}`}>
                        {new Date(model.created * 1000).toLocaleString(undefined, {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                        })}
                    </p>
                )}
                {costLabel && (
                    <p className={`${costClass} mt-1.5 font-medium`} style={{ color: 'var(--credits-fg)' }}>
                        {costLabel}
                    </p>
                )}
            </div>

            <div className="flex shrink-0 items-center gap-1.5">
                {onShowDetails && (
                    <button
                        type="button"
                        className={`flex shrink-0 items-center justify-center rounded-md border border-gray-200 bg-white transition-colors hover:border-gray-300 hover:bg-gray-50 dark:border-zinc-600 dark:bg-zinc-900 dark:hover:border-zinc-500 dark:hover:bg-zinc-800 ${isMobile ? 'p-0.5' : 'p-1'
                            }`}
                        onClick={(e) => {
                            e.stopPropagation();
                            onShowDetails();
                        }}
                        title="More info"
                    >
                        <FiInfo size={isMobile ? 12 : 14} />
                    </button>
                )}
                <ModelToggleSwitch
                    checked={isPinned}
                    onChange={onTogglePin}
                    label={isPinned ? `Remove ${displayName} from quick picks` : `Add ${displayName} to quick picks`}
                />
            </div>
        </div>
    );
});

export default ModelSelectionFeaturedCard;
