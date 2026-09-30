import React, { memo, useMemo } from 'react';
import { FiInfo, FiLayers, FiArrowRight } from 'react-icons/fi';
import { Model } from '@/app/components/model-interface/shared/types';
import { hasExtraToolingCapability, getModelDisplayName } from '@/app/components/model-interface/shared/utils';
import { ModelToggleSwitch } from '@/app/components/ChatBoxInput/ModelToggleSwitch';
import { buildModelCardSlots } from '../utils/modelMetaPills.utils';
import {
    computeModelRequiredBalance,
    isModelPickLocked,
} from '../utils/modelWalletAffordance.utils';
import { isConversationPickableModel } from '../utils/modelConversationEligibility.utils';
import { ModelWalletLockIndicator } from './ModelWalletLockIndicator';
import { ModelCreditBurnIndicator } from './ModelCreditBurnIndicator';

const ToolsCapabilityIcon = ({ size = 10, className = '' }: { size?: number; className?: string }) => (
    <FiLayers size={size} className={className} aria-hidden strokeWidth={1.75} />
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
    wallet?: number | null;
    selectedModelId?: string;
    onAddCredits?: () => void;
    /** True when this card is the recently-picked model currently being previewed. */
    isPreviewedRecent?: boolean;
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
    wallet = null,
    selectedModelId,
    onAddCredits,
    isPreviewedRecent = false,
}: ModelSelectionFeaturedCardProps) {
    const supportsTools = hasExtraToolingCapability(model);
    const displayName = getModelDisplayName(model);
    const requiredBalance = useMemo(
        () => computeModelRequiredBalance(model, averageCost),
        [model, averageCost],
    );
    const isWalletLocked = useMemo(
        () =>
            isModelPickLocked(wallet, requiredBalance, {
                modelId: model.id,
                selectedModelId,
            }),
        [wallet, requiredBalance, model.id, selectedModelId],
    );
    const isCatalogOnly = !isConversationPickableModel(model);
    const isPrimaryDisabled = isWalletLocked || isCatalogOnly;
    const slots = useMemo(
        () => buildModelCardSlots(model, averageCost, wallet),
        [model, averageCost, wallet],
    );

    const handlePrimaryAction = () => {
        if (isWalletLocked) {
            onAddCredits?.();
            return;
        }
        if (isCatalogOnly) {
            onShowDetails?.();
            return;
        }
        onSelect();
        try {
            document.getElementById('chat-input')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } catch {
            /* ignore */
        }
    };

    return (
        <div
            role="button"
            tabIndex={isPrimaryDisabled && !isCatalogOnly ? -1 : 0}
            className={`group app-model-card relative w-full ${isMobile ? 'px-2.5 py-1.5' : 'px-3 py-1.5'} ${isSelected ? 'app-model-card--selected' : ''} ${isPreviewedRecent && !isCatalogOnly ? 'app-model-card--previewed-recent' : ''} ${isWalletLocked ? 'app-model-card--wallet-locked mb-1 cursor-not-allowed [background-color:color-mix(in_srgb,var(--modal-fg)_8%,transparent)]' : isCatalogOnly ? 'cursor-pointer opacity-90' : 'cursor-pointer'}`}
            onClick={handlePrimaryAction}
            onKeyDown={(e) => {
                if (isWalletLocked) return;
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handlePrimaryAction();
                }
            }}
            aria-disabled={isWalletLocked}
            aria-label={isCatalogOnly ? `${displayName} — catalog preview, not for text chat` : undefined}
        >
            <div className="app-model-card__layout">
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                        <span className={`truncate app-model-card__title ${isWalletLocked ? 'opacity-70' : ''}`}>
                            {displayName}
                        </span>
                        {supportsTools && (
                            <span
                                className="app-model-card__tools-hint shrink-0 inline-flex items-center"
                                title="Extra tooling (Gmail, Keep, etc.)"
                            >
                                <ToolsCapabilityIcon size={10} />
                            </span>
                        )}
                    </div>
                    {isWalletLocked ? (
                        <ModelWalletLockIndicator
                            requiredBalance={requiredBalance}
                            wallet={wallet}
                            className="mt-1"
                        />
                    ) : slots.cost?.burnPercentage !== null && slots.cost?.burnPercentage !== undefined && slots.cost.burnPercentage >= 60 ? (
                        <ModelCreditBurnIndicator
                            burnPercentage={slots.cost.burnPercentage}
                            className="mt-1"
                        />
                    ) : isCatalogOnly ? (
                        <span className="block truncate app-model-card__cost text-[var(--sidebar-muted-fg)]">
                            Catalog only — not for text chat
                        </span>
                    ) : slots.cost ? (
                        <span className="block truncate app-model-card__cost">
                            {slots.cost.label}
                        </span>
                    ) : null}
                </div>

                {isSortingByReleaseDate && slots.release && (
                    <span
                        className={`app-model-card__date shrink-0 ${
                            isMobile ? '!text-[9.5px]' : ''
                        }`}
                        title={`Released: ${slots.release}`}
                    >
                        {slots.release}
                    </span>
                )}

                {isPreviewedRecent && !isCatalogOnly && (
                    <span
                        className="app-model-card__previewed-cta shrink-0"
                        aria-label="Click to use this model for chat"
                    >
                        <FiArrowRight size={10} strokeWidth={2.5} />
                        <span>Click to use</span>
                    </span>
                )}

                <div className="app-model-card__actions">
                    {onShowDetails && (
                        <button
                            type="button"
                            className={`flex shrink-0 items-center justify-center rounded-lg text-[var(--sidebar-muted-fg)] opacity-60 transition-all hover:opacity-100 hover:text-[var(--sidebar-fg)] hover:bg-black/5 dark:hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--chat-accent)] focus-visible:ring-offset-1 focus-visible:opacity-100 ${isMobile ? 'h-5.5 w-5.5' : 'h-6 w-6'
                                }`}
                            onClick={(e) => {
                                e.stopPropagation();
                                onShowDetails();
                            }}
                            title="More info"
                        >
                            <FiInfo size={12} strokeWidth={1.75} />
                        </button>
                    )}
                    {!isCatalogOnly ? (
                        <ModelToggleSwitch
                            checked={isPinned}
                            onChange={onTogglePin}
                            label={isPinned ? `Remove ${displayName} from quick picks` : `Add ${displayName} to quick picks`}
                            size="xs"
                            variant={isPinned ? "default" : "quiet"}
                        />
                    ) : null}
                </div>
            </div>
        </div>
    );
});

export default ModelSelectionFeaturedCard;
