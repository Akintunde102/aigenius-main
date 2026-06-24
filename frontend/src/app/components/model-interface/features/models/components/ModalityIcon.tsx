import React from 'react';
import { FaRegImage, FaRegFileAudio, FaRegFileVideo } from 'react-icons/fa';
import { FiLayers } from 'react-icons/fi';
import { getModalityDisplay } from '@/app/components/model-interface/shared/utils';

const ICON_CLASSES: Record<string, string> = {
    image: 'text-pink-500',
    audio: 'text-green-500',
    video: 'text-cyan-500',
    other: 'text-gray-500',
};

type ModalityIconProps = {
    mod: string;
    size?: number;
    className?: string;
    showLabel?: boolean;
};

/** Renders the icon (and optional label) for a modality for intuitive filter UI. */
export function ModalityIcon({ mod, size = 12, className = '', showLabel = false }: ModalityIconProps) {
    const { iconKey, label } = getModalityDisplay(mod);
    const colorClass = ICON_CLASSES[iconKey] ?? ICON_CLASSES.other;
    const Icon =
        iconKey === 'image' ? FaRegImage
            : iconKey === 'audio' ? FaRegFileAudio
                : iconKey === 'video' ? FaRegFileVideo
                    : FiLayers;
    return (
        <span className={`inline-flex items-center gap-1 ${className}`} title={label}>
            <Icon size={size} className={`flex-shrink-0 ${colorClass}`} />
            {showLabel && <span className="font-medium text-gray-600 truncate">{label}</span>}
        </span>
    );
}
