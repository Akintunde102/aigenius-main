import React, { memo, useMemo } from 'react';
import { FiInfo, FiLayers } from 'react-icons/fi';
import { Model } from '@/app/components/model-interface/shared/types';
import { hasExtraToolingCapability, getModelDisplayName } from '@/app/components/model-interface/shared/utils';
import { ModelToggleSwitch } from '@/app/components/ChatBoxInput/ModelToggleSwitch';
import { buildModelCardSlots } from '../utils/modelMetaPills.utils';
import {
    computeModelRequiredBalance,
    isModelPickLocked,
} from '../utils/modelWalletAffordance.utils';
import { ModelWalletLockIndicator } from './ModelWalletLockIndicator';

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
    wallet?: number | null;
    selectedModelId?: string;
    onAddCredits?: () => void;
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
    wallet = null,
    selectedModelId,
    onAddCredits,
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
    const slots = useMemo(
        () => buildModelCardSlots(model, averageCost),
        [model, averageCost],
    );

    const handlePrimaryAction = () => {
        if (isWalletLocked) {
            onAddCredits?.();
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
            tabIndex={isWalletLocked ? -1 : 0}
            className={`group app-model-card relative w-full max-w-xl px-2.5 py-1.5 ${isSelected ? 'app-model-card--selected' : ''} ${isWalletLocked ? 'app-model-card--wallet-locked mb-1 cursor-not-allowed [background-color:color-mix(in_srgb,var(--modal-fg)_8%,transparent)]' : 'cursor-pointer'}`}
            onClick={handlePrimaryAction}
            onKeyDown={(e) => {
                if (isWalletLocked) return;
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handlePrimaryAction();
                }
            }}
            aria-disabled={isWalletLocked}
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
                    <span className={`block truncate app-model-card__title ${isWalletLocked ? 'opacity-70' : ''}`}>
                        {displayName}
                    </span>
                    {isWalletLocked ? (
                        <ModelWalletLockIndicator
                            requiredBalance={requiredBalance}
                            wallet={wallet}
                            className="mt-1"
                        />
                    ) : slots.cost ? (
                        <span className="block truncate app-model-card__cost">
                            {slots.cost.label}
                        </span>
                    ) : null}
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
