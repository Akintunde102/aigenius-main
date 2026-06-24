import React from 'react';
import { FiX, FiUser } from 'react-icons/fi';
import { ActionButtons } from './ActionButtons';
import { ChatControlsProps } from './types';

// Left Controls Section Component
const LeftControlsSection: React.FC<{
    disabled: boolean;
    uploading: boolean;
    supportsFileUpload: boolean;
    onAttachmentClick: () => void;
    streaming?: boolean;
    onStreamingToggle?: (enabled: boolean) => void;
    selectedModel: any;
    onModelNameClick?: () => void;
    sidebarStyle: boolean;
    glisten: boolean;
    selectedPersonalityName?: string;
    onPersonalityClick?: () => void;
    selectedPersonalityIconUrl?: string;
    onClearPersonality?: () => void;
    compact?: boolean;
    hideModelSelector?: boolean;
    hideUpload?: boolean;
    mini?: boolean;
    onAudioModeToggle?: (enabled: boolean) => void;
    isAudioMode?: boolean;
    onStartSTT?: () => void;
    isSTTActive?: boolean;
    isDictationTranscribing?: boolean;
}> = ({
    disabled,
    uploading,
    supportsFileUpload,
    onAttachmentClick,
    streaming,
    onStreamingToggle,
    selectedModel,
    onModelNameClick,
    sidebarStyle,
    glisten,
    selectedPersonalityName,
    onPersonalityClick,
    selectedPersonalityIconUrl,
    onClearPersonality,
    compact,
    hideModelSelector,
    hideUpload,
    mini,
    onAudioModeToggle,
    isAudioMode,
    onStartSTT,
    isSTTActive,
    isDictationTranscribing,
}) => {
        return (
            <div className="flex items-center gap-2">
                {/* Model Selection Button - hidden when a personality is active or explicitly hidden */}
                {!selectedPersonalityName && !hideModelSelector && (
                    selectedModel?.name ? (
                        // Active model display - gray pill, subtle border, compact padding
                        <button
                            type="button"
                            onClick={onModelNameClick}
                            disabled={disabled || !onModelNameClick}
                            className={`inline-flex items-center gap-2 rounded-full border text-[13px] transition-colors disabled:cursor-not-allowed disabled:opacity-50 [border-color:var(--chat-composer-border)] [background-color:color-mix(in_srgb,var(--chat-composer-bg)_88%,transparent)] [color:var(--sidebar-muted-fg)] hover:[color:var(--sidebar-fg)] hover:[background-color:var(--chat-composer-bg)] ${mini ? 'px-1.5 py-0.5' : 'px-2 py-0.5'
                                }`}
                            title={`Model: ${selectedModel.name}`}
                        >
                            <span className={`${mini ? 'text-[10px]' : 'text-xs'} font-medium truncate max-w-32`}>
                                {selectedModel.name}
                            </span>
                        </button>
                    ) : (
                        // Inactive model button - gray pill
                        <button
                            type="button"
                            onClick={onModelNameClick}
                            disabled={disabled || !onModelNameClick}
                            className="inline-flex items-center gap-2 rounded-full border px-2 py-0.5 text-[13px] transition-colors disabled:cursor-not-allowed disabled:opacity-50 [border-color:var(--chat-composer-border)] [background-color:color-mix(in_srgb,var(--chat-composer-bg)_88%,transparent)] [color:var(--chat-muted-fg)] hover:[color:var(--sidebar-fg)] hover:[background-color:var(--chat-composer-bg)]"
                            title="Select model"
                        >
                            <span className="text-xs">Select model</span>
                        </button>
                    )
                )}

                {/* Personality controls: select or clear - hidden in compact mode if not active */}
                {!hideModelSelector && (
                    <div className="inline-flex items-center gap-1">
                        {selectedPersonalityName ? (
                            // Active personality display - same gray scheme as model button
                            <div className="inline-flex items-center gap-2 rounded-full border px-2 py-0.5 text-[13px] [border-color:var(--chat-composer-border)] [background-color:var(--chat-composer-bg)] [color:var(--sidebar-fg)]">
                                <span className="inline-flex items-center">
                                    {selectedPersonalityIconUrl ? (
                                        <img
                                            src={selectedPersonalityIconUrl}
                                            alt="icon"
                                            className="w-4 h-4 rounded object-cover"
                                            loading="lazy"
                                            decoding="async"
                                        />
                                    ) : (
                                        <FiUser size={14} />
                                    )}
                                </span>
                                <span className="text-xs font-medium truncate max-w-32" title={`Personality: ${selectedPersonalityName}`}>
                                    {selectedPersonalityName}
                                </span>
                                <button
                                    type="button"
                                    onClick={onClearPersonality}
                                    disabled={disabled || !onClearPersonality}
                                    className="ml-1 rounded-full p-0.5 transition-colors hover:bg-[#E2E8F0] dark:hover:bg-zinc-700"
                                    title="Clear personality"
                                    aria-label="Clear personality"
                                >
                                    <FiX size={12} />
                                </button>
                            </div>
                        ) : !compact && (
                            // Inactive personality button - same gray scheme as model button
                            <button
                                type="button"
                                onClick={onPersonalityClick}
                                disabled={disabled || !onPersonalityClick}
                                className="inline-flex items-center gap-2 rounded-full border px-2 py-0.5 text-[13px] transition-colors disabled:cursor-not-allowed disabled:opacity-50 [border-color:var(--chat-composer-border)] [background-color:color-mix(in_srgb,var(--chat-composer-bg)_88%,transparent)] [color:var(--chat-muted-fg)] hover:[color:var(--sidebar-fg)] hover:[background-color:var(--chat-composer-bg)]"
                                title="Select personality"
                            >
                                <span className="inline-flex items-center">
                                    <FiUser size={14} />
                                </span>
                            </button>
                        )}
                    </div>
                )}

                {!hideUpload && (
                    <ActionButtons
                        disabled={disabled}
                        uploading={uploading}
                        supportsFileUpload={supportsFileUpload}
                        onAttachmentClick={onAttachmentClick}
                        streaming={streaming}
                        onStreamingToggle={onStreamingToggle}
                        onAudioModeToggle={onAudioModeToggle}
                        isAudioMode={isAudioMode}
                        onStartSTT={onStartSTT}
                        isSTTActive={isSTTActive}
                        isDictationTranscribing={isDictationTranscribing}
                    />
                )}
            </div>
        );
    };

// Model Selection Section Component (Commented out - moved to left side)
/*
const ModelSelectionSection: React.FC<{
    selectedModel: any;
    onModelNameClick?: () => void;
    disabled: boolean;
    uploading: boolean;
    sidebarStyle: boolean;
    glisten: boolean;
}> = ({ selectedModel, onModelNameClick, disabled, uploading, sidebarStyle, glisten }) => {
    const getModalityIcon = (modality: string) => {
        const iconColor = "text-gray-500";
        const iconProps = { size: 8, className: iconColor };

        if (modality.toLowerCase().includes('text')) return <FiFileText {...iconProps} />;
        if (modality.toLowerCase().includes('image')) return <FiCamera {...iconProps} />;
        if (modality.toLowerCase().includes('audio')) return <FiHeadphones {...iconProps} />;
        if (modality.toLowerCase().includes('video')) return <FiMonitor {...iconProps} />;
        return <FiFile {...iconProps} />;
    };

    const modelButtonStyles = sidebarStyle
        ? `px-2 py-0.5 text-[7px] md:text-[8px] font-normal bg-gray-100 text-gray-700 border border-gray-300 rounded hover:bg-gray-200 hover:border-gray-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${glisten ? 'glisten-border' : ''}`
        : `px-2 py-0.5 text-[7px] md:text-[8px] font-normal bg-gray-100 text-gray-700 border border-gray-300 rounded hover:bg-gray-200 hover:border-gray-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${glisten ? 'glisten-border' : ''}`;

    const separatorStyles = sidebarStyle ? "text-gray-400 font-light text-[6px] md:text-[7px]" : "text-gray-400 font-light text-[6px] md:text-[7px]";

    const modalityIconStyles = sidebarStyle
        ? "p-0.5 rounded bg-gray-100 border border-gray-300 hover:border-gray-400 transition-colors"
        : "p-0.5 rounded bg-gray-100 border border-gray-300 hover:border-gray-400 transition-colors";

    return (
        <div className="flex items-center gap-1 flex-1 justify-center">
            <div className="flex items-center gap-1">
                <button
                    type="button"
                    onClick={onModelNameClick}
                    disabled={disabled || uploading || !onModelNameClick}
                    className={modelButtonStyles}
                >
                    {selectedModel?.name || "Select model"}
                </button>

                // Modalities commented out for now
                {selectedModel?.architecture?.input_modalities && selectedModel.architecture.input_modalities.filter((mod: string) => (mod || '').toLowerCase() !== 'text').length > 0 && (
                    <>
                        <span className={separatorStyles}>•</span>
                        <div className="flex items-center gap-0.5">
                            {selectedModel.architecture.input_modalities
                                .filter((mod: string) => (mod || '').toLowerCase() !== 'text')
                                .map((mod: string) => (
                                    <span
                                        key={mod}
                                        className={modalityIconStyles}
                                        title={`Supports ${mod}`}
                                    >
                                        {getModalityIcon(mod)}
                                    </span>
                                ))}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};
*/

// Submit button has been moved to ChatTextarea component

export const ChatControls: React.FC<ChatControlsProps> = React.memo(({
    disabled,
    uploading,
    supportsFileUpload,
    selectedModel,
    onModelNameClick,
    onAttachmentClick,
    sidebarStyle = false,
    streaming,
    onStreamingToggle,
    glisten = false,
    selectedPersonalityName,
    selectedPersonalityIconUrl,
    onPersonalityClick,
    onClearPersonality,
    compact = false,
    hideModelSelector = false,
    hideUpload = false,
    mini = false,
    onAudioModeToggle,
    isAudioMode,
    onStartSTT,
    isSTTActive,
    isDictationTranscribing,
}) => {
    return (
        <div className={`bg-white px-2 pb-1 [background-clip:padding-box] dark:bg-transparent ${compact ? 'border-none' : ''}`}>
            <div className={`flex items-center rounded-full px-2 py-1 ${compact ? 'p-0' : ''}`}>
                <LeftControlsSection
                    disabled={disabled}
                    uploading={uploading}
                    supportsFileUpload={supportsFileUpload}
                    onAttachmentClick={onAttachmentClick}
                    streaming={streaming}
                    onStreamingToggle={onStreamingToggle}
                    selectedModel={selectedModel}
                    onModelNameClick={onModelNameClick}
                    sidebarStyle={sidebarStyle}
                    glisten={glisten}
                    selectedPersonalityName={selectedPersonalityName}
                    selectedPersonalityIconUrl={selectedPersonalityIconUrl}
                    onPersonalityClick={onPersonalityClick}
                    onClearPersonality={onClearPersonality}
                    compact={compact}
                    hideModelSelector={hideModelSelector}
                    hideUpload={hideUpload}
                    mini={mini}
                    onAudioModeToggle={onAudioModeToggle}
                    isAudioMode={isAudioMode}
                    onStartSTT={onStartSTT}
                    isSTTActive={isSTTActive}
                    isDictationTranscribing={isDictationTranscribing}
                />
            </div>
        </div>
    );
}); 
