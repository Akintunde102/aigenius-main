import React, { useState, useRef, useEffect } from 'react';
import { FiStar, FiTrash2, FiMoreVertical, FiLoader, FiGlobe, FiDownload, FiChevronRight } from 'react-icons/fi';
import type { TranscriptFormat } from '@/lib/utils/conversationTranscriptExport';

const DROPDOWN_MENU_ROW =
    'sidebar-menu-row flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs transition-colors';

const DROPDOWN_SUBMENU_ROW =
    'sidebar-menu-row flex w-full items-center px-3 py-1.5 pl-8 text-left text-xs transition-colors';

interface ActionDropdownProps {
    isStarred: boolean;
    isStarring: boolean;
    isDeleting: boolean;
    isPublished?: boolean;
    isPublishing?: boolean;
    onStarClick: (e: React.MouseEvent) => void;
    onDeleteClick: (e: React.MouseEvent) => void;
    onPublishClick?: (e: React.MouseEvent) => void;
    onDownloadTranscript?: (format: TranscriptFormat) => void;
}

export const ActionDropdown: React.FC<ActionDropdownProps> = ({
    isStarred,
    isStarring,
    isDeleting,
    isPublished = false,
    isPublishing = false,
    onStarClick,
    onDeleteClick,
    onPublishClick,
    onDownloadTranscript,
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [showDownloadFormats, setShowDownloadFormats] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                setShowDownloadFormats(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleDropdownToggle = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsOpen((open) => {
            if (open) {
                setShowDownloadFormats(false);
            }
            return !open;
        });
    };

    const handleActionClick = (action: (e: React.MouseEvent) => void) => (e: React.MouseEvent) => {
        e.stopPropagation();
        action(e);
        setIsOpen(false);
        setShowDownloadFormats(false);
    };

    const handleDownloadToggle = (e: React.MouseEvent) => {
        e.stopPropagation();
        setShowDownloadFormats((open) => !open);
    };

    const handleDownloadFormatClick = (format: TranscriptFormat) => (e: React.MouseEvent) => {
        e.stopPropagation();
        onDownloadTranscript?.(format);
        setIsOpen(false);
        setShowDownloadFormats(false);
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
                    className="absolute right-0 z-50 mt-1 min-w-[10.5rem] rounded-md shadow-[0_12px_40px_rgba(0,0,0,0.25)]"
                    style={{
                        backgroundColor: "var(--sidebar-menu-bg)",
                        border: "1px solid var(--sidebar-menu-border)",
                    }}
                >
                    <div className="py-1">
                        {/* Star Action */}
                        <button
                            className={`${DROPDOWN_MENU_ROW} ${isStarred ? "text-amber-400" : ""}`}
                            style={isStarred ? undefined : { color: "var(--sidebar-menu-fg)" }}
                            onClick={handleActionClick(onStarClick)}
                            disabled={isStarring || isDeleting}
                        >
                            {isStarring ? (
                                <FiLoader size={13} className="animate-spin shrink-0" />
                            ) : (
                                <FiStar size={13} className="shrink-0" fill={isStarred ? '#d97706' : 'none'} />
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
                                className={`${DROPDOWN_MENU_ROW} ${isPublished ? "text-emerald-400" : ""}`}
                                style={!isPublished ? { color: "var(--chat-accent)" } : undefined}
                                onClick={handleActionClick(onPublishClick)}
                                disabled={isPublishing || isDeleting || isStarring}
                            >
                                {isPublishing ? (
                                    <FiLoader size={13} className="animate-spin shrink-0" />
                                ) : (
                                    <FiGlobe size={13} className="shrink-0" fill={isPublished ? '#059669' : 'none'} />
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

                        {onDownloadTranscript && (
                            <>
                                <button
                                    className={`${DROPDOWN_MENU_ROW} justify-between`}
                                    style={{ color: 'var(--sidebar-menu-fg)' }}
                                    onClick={handleDownloadToggle}
                                    disabled={isDeleting || isStarring || isPublishing}
                                >
                                    <span className="flex items-center gap-2">
                                        <FiDownload size={13} className="shrink-0" />
                                        <span>Download transcript</span>
                                    </span>
                                    <FiChevronRight
                                        size={12}
                                        className={`shrink-0 transition-transform ${showDownloadFormats ? 'rotate-90' : ''}`}
                                    />
                                </button>

                                {showDownloadFormats && (
                                    <>
                                        <button
                                            className={DROPDOWN_SUBMENU_ROW}
                                            style={{ color: 'var(--sidebar-menu-fg)' }}
                                            onClick={handleDownloadFormatClick('txt')}
                                        >
                                            Plain text (.txt)
                                        </button>
                                        <button
                                            className={DROPDOWN_SUBMENU_ROW}
                                            style={{ color: 'var(--sidebar-menu-fg)' }}
                                            onClick={handleDownloadFormatClick('md')}
                                        >
                                            Markdown (.md)
                                        </button>
                                        <button
                                            className={DROPDOWN_SUBMENU_ROW}
                                            style={{ color: 'var(--sidebar-menu-fg)' }}
                                            onClick={handleDownloadFormatClick('json')}
                                        >
                                            JSON (.json)
                                        </button>
                                    </>
                                )}
                            </>
                        )}

                        {/* Delete Action */}
                        <button
                            className={`${DROPDOWN_MENU_ROW} text-red-500`}
                            onClick={handleActionClick(onDeleteClick)}
                            disabled={isDeleting || isStarring || isPublishing}
                        >
                            {isDeleting ? (
                                <FiLoader size={13} className="animate-spin shrink-0" />
                            ) : (
                                <FiTrash2 size={13} className="shrink-0" />
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
