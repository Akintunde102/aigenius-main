import React from 'react';
import { FiStar, FiLoader } from 'react-icons/fi';
import { ActionDropdown } from './ActionDropdown';

interface ActionButtonsProps {
    isStarred: boolean;
    isStarring: boolean;
    isDeleting: boolean;
    isPublished?: boolean;
    isPublishing?: boolean;
    onStarClick: (e: React.MouseEvent) => void;
    onDeleteClick: (e: React.MouseEvent) => void;
    onPublishClick?: (e: React.MouseEvent) => void;
}

export const ActionButtons: React.FC<ActionButtonsProps> = ({
    isStarred,
    isStarring,
    isDeleting,
    isPublished = false,
    isPublishing = false,
    onStarClick,
    onDeleteClick,
    onPublishClick
}) => {
    return (
        <div className="flex shrink-0 items-center gap-0.5">
            {/* Star button - only visible on hover */}
            <button
                className={`p-0.5 text-amber-500/90 opacity-0 transition hover:text-amber-600 group-hover:opacity-100 ${isStarring ? "opacity-100" : ""
                    }`}
                onClick={onStarClick}
                title={isStarring ? 'Processing...' : (isStarred ? 'Unstar' : 'Star')}
                disabled={isStarring || isDeleting}
            >
                {isStarring ? (
                    <FiLoader size={12} className="animate-spin" />
                ) : (
                    <FiStar size={12} fill={isStarred ? '#facc15' : 'none'} />
                )}
            </button>

            {/* Dropdown with all actions (star, publish, delete) */}
            <ActionDropdown
                isStarred={isStarred}
                isStarring={isStarring}
                isDeleting={isDeleting}
                isPublished={isPublished}
                isPublishing={isPublishing}
                onStarClick={onStarClick}
                onDeleteClick={onDeleteClick}
                onPublishClick={onPublishClick}
            />
        </div>
    );
};
