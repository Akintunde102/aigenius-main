import React, { useState, useRef, useEffect } from 'react';
import { FiStar, FiTrash2, FiMoreVertical, FiLoader, FiGlobe } from 'react-icons/fi';

interface ActionDropdownProps {
    isStarred: boolean;
    isStarring: boolean;
    isDeleting: boolean;
    isPublished?: boolean;
    isPublishing?: boolean;
    onStarClick: (e: React.MouseEvent) => void;
    onDeleteClick: (e: React.MouseEvent) => void;
    onPublishClick?: (e: React.MouseEvent) => void;
}

export const ActionDropdown: React.FC<ActionDropdownProps> = ({
    isStarred,
    isStarring,
    isDeleting,
    isPublished = false,
    isPublishing = false,
    onStarClick,
    onDeleteClick,
    onPublishClick
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleDropdownToggle = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsOpen(!isOpen);
    };

    const handleActionClick = (action: (e: React.MouseEvent) => void) => (e: React.MouseEvent) => {
        e.stopPropagation();
        action(e);
        setIsOpen(false);
    };

    const isProcessing = isStarring || isDeleting || isPublishing;

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                className={`p-0.5 text-slate-400 opacity-0 transition hover:text-slate-100 group-hover:opacity-100 ${isProcessing ? "opacity-100" : ""}`}
                onClick={handleDropdownToggle}
                title="More actions"
                disabled={isProcessing}
            >
                <FiMoreVertical size={12} />
            </button>

            {isOpen && (
                <div
                    className="absolute right-0 z-50 mt-1 w-48 rounded-md shadow-[0_12px_40px_rgba(0,0,0,0.25)]"
                    style={{
                        backgroundColor: "var(--sidebar-menu-bg)",
                        border: "1px solid var(--sidebar-menu-border)",
                    }}
                >
                    <div className="py-1">
                        {/* Star Action */}
                        <button
                            className={`sidebar-menu-row flex w-full items-center space-x-2 px-4 py-2 text-left text-sm ${isStarred ? "text-amber-400" : ""
                                }`}
                            style={isStarred ? undefined : { color: "var(--sidebar-menu-fg)" }}
                            onClick={handleActionClick(onStarClick)}
                            disabled={isStarring || isDeleting}
                        >
                            {isStarring ? (
                                <FiLoader size={14} className="animate-spin" />
                            ) : (
                                <FiStar size={14} fill={isStarred ? '#d97706' : 'none'} />
                            )}
                            <span>
                                {isStarring
                                    ? 'Processing...'
                                    : isStarred
                                        ? 'Unstar'
                                        : 'Star'
                                }
                            </span>
                        </button>

                        {/* Publish Action */}
                        {onPublishClick && (
                            <button
                                className={`sidebar-menu-row flex w-full items-center space-x-2 px-4 py-2 text-left text-sm ${isPublished ? "text-emerald-400" : ""}`}
                                style={!isPublished ? { color: "var(--chat-accent)" } : undefined}
                                onClick={handleActionClick(onPublishClick)}
                                disabled={isPublishing || isDeleting || isStarring}
                            >
                                {isPublishing ? (
                                    <FiLoader size={14} className="animate-spin" />
                                ) : (
                                    <FiGlobe size={14} fill={isPublished ? '#059669' : 'none'} />
                                )}
                                <span>
                                    {isPublishing
                                        ? 'Publishing...'
                                        : isPublished
                                            ? 'Republish'
                                            : 'Publish'
                                    }
                                </span>
                            </button>
                        )}

                        {/* Delete Action */}
                        <button
                            className="sidebar-menu-row flex w-full items-center space-x-2 px-4 py-2 text-left text-sm text-red-500"
                            onClick={handleActionClick(onDeleteClick)}
                            disabled={isDeleting || isStarring || isPublishing}
                        >
                            {isDeleting ? (
                                <FiLoader size={14} className="animate-spin" />
                            ) : (
                                <FiTrash2 size={14} />
                            )}
                            <span>
                                {isDeleting ? 'Deleting...' : 'Delete'}
                            </span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
