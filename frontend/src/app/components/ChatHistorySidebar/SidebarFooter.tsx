import React, { useState, useRef, useEffect } from "react";
import { FiBookmark, FiMoreVertical, FiLogOut, FiLink, FiGift, FiFolder, FiZap, FiBell, FiMoon, FiSun, FiPlus, FiMonitor } from 'react-icons/fi';
import { useTheme } from "@/lib/providers/ThemeProvider";

/** Fixed slot so mixed Feather icons (diagonal link vs square folder) align in the menu column. */
const MENU_ICON_SLOT =
    "flex size-[18px] shrink-0 items-center justify-center text-current [&>svg]:block";

const MENU_ROW_BASE =
    "sidebar-menu-row flex w-full items-center gap-2.5 px-4 py-2 text-left text-sm transition-colors";

interface SidebarFooterProps {
    wallet?: number | null;
    onAddCredits: () => void;
    onShowSavedChats?: () => void;
    onOpenMyFiles?: () => void;
    onOpenWorkflows?: () => void;
    onOpenNotifications?: () => void;
    onIntegrations?: () => void;
    onGiveCredits?: () => void;
    onLogout?: () => void;
    /** When incremented (e.g. from collapsed-rail avatar), opens the “more actions” menu. */
    openMenuSignal?: number;
}

const SidebarFooter = React.memo<SidebarFooterProps>(({ wallet, onAddCredits, onShowSavedChats, onOpenMyFiles, onOpenWorkflows, onOpenNotifications, onIntegrations, onGiveCredits, onLogout, openMenuSignal }) => {
    const [showTooltip, setShowTooltip] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const { theme, resolvedTheme, setTheme } = useTheme();
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (openMenuSignal === undefined || openMenuSignal < 1) return;
        setIsMenuOpen(true);
    }, [openMenuSignal]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false);
            }
        };
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

    const walletFormatted =
        typeof wallet === 'number'
            ? wallet.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
            })
            : null;

    return (
        <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', zIndex: 10 }}>
            <div
                className="flex w-full items-center justify-between px-4 py-2 pr-2 text-xs"
                style={{
                    backgroundColor: "var(--sidebar-bg)",
                    borderTop: "1px solid var(--sidebar-border)",
                    color: "var(--sidebar-muted-fg)",
                    boxShadow: "0 -1px 0 0 rgba(0,0,0,0.1)",
                }}
                aria-label="Nobox"
            >
                {/* Powered by Nobox left — unchanged presentation */}
                <div className="relative">
                    <span
                        className="flex cursor-help items-center text-xs font-medium text-slate-400"
                        onMouseEnter={() => setShowTooltip(true)}
                        onMouseLeave={() => setShowTooltip(false)}
                    >
                        <svg
                            width="15"
                            height="15"
                            viewBox="0 0 20 20"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                            className="mr-1 inline-block"
                            style={{ verticalAlign: 'middle' }}
                        >
                            <path
                                d="M11.3 1.046a1 1 0 0 1 .7 1.054l-.3 5.9h4.3a1 1 0 0 1 .8 1.6l-8 10.5a1 1 0 0 1-1.8-.8l.3-5.8H3.1a1 1 0 0 1-.8-1.6l8-10.5a1 1 0 0 1 .9-.354z"
                                fill="#FECB00"
                            />
                        </svg>
                        by <span className="ml-1 font-bold tracking-wide text-[#FECB00]">Nobox</span>
                    </span>

                    {showTooltip && (
                        <div className="absolute bottom-full left-0 z-50 translate-y-[-8px] transform whitespace-nowrap rounded-md bg-[#0F172A] px-3 py-2 text-xs text-white shadow-[0px_8px_20px_rgba(0,0,0,0.06)]">
                            Email us at nobox.hq@gmail.com
                            <div className="absolute left-4 top-full h-0 w-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-[#0F172A]" />
                        </div>
                    )}
                </div>

                {/* Credits live in the menu; footer shows menu trigger only */}
                <div className="relative shrink-0" ref={menuRef}>
                    <button
                        type="button"
                        aria-label="Sidebar menu"
                        aria-haspopup="menu"
                        aria-expanded={isMenuOpen}
                        className="flex h-6 w-6 items-center justify-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/40"
                        style={{ color: "var(--sidebar-muted-fg)" }}
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsMenuOpen((o) => !o);
                        }}
                        title="Menu"
                    >
                        <FiMoreVertical size={13} />
                    </button>
                    {isMenuOpen && (
                        <div
                            className="absolute bottom-full right-0 z-[999] mb-1 min-w-[12rem] rounded-lg shadow-[0_12px_40px_rgba(0,0,0,0.35)]"
                            style={{
                                backgroundColor: "var(--sidebar-menu-bg)",
                                border: "1px solid var(--sidebar-menu-border)",
                            }}
                        >
                            <div className="py-1">
                                {walletFormatted !== null && (
                                    <>
                                        <div
                                            className="border-b px-4 py-2.5 text-xs"
                                            style={{ borderColor: "var(--sidebar-menu-border)" }}
                                        >
                                            <div style={{ color: "var(--sidebar-muted-fg)" }}>Credits</div>
                                            <div
                                                className="mt-0.5 font-semibold tabular-nums text-sm"
                                                style={{ color: "var(--sidebar-fg)" }}
                                            >
                                                {walletFormatted}
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            className={MENU_ROW_BASE}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onAddCredits();
                                                setIsMenuOpen(false);
                                            }}
                                        >
                                            <span className={MENU_ICON_SLOT} aria-hidden>
                                                <FiPlus size={14} strokeWidth={2} />
                                            </span>
                                            <span>Add credits</span>
                                        </button>
                                    </>
                                )}

                                {onShowSavedChats && (
                                    <button
                                        type="button"
                                        className={MENU_ROW_BASE}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onShowSavedChats();
                                            setIsMenuOpen(false);
                                        }}
                                    >
                                        <span className={MENU_ICON_SLOT} aria-hidden>
                                            <FiBookmark size={14} strokeWidth={2} />
                                        </span>
                                        <span>Saved messages</span>
                                    </button>
                                )}

                                {onOpenMyFiles && (
                                    <button
                                        type="button"
                                        className={MENU_ROW_BASE}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onOpenMyFiles();
                                            setIsMenuOpen(false);
                                        }}
                                    >
                                        <span className={MENU_ICON_SLOT} aria-hidden>
                                            <FiFolder size={14} strokeWidth={2} />
                                        </span>
                                        <span>My files</span>
                                    </button>
                                )}

                                {onOpenWorkflows && (
                                    <button
                                        type="button"
                                        className={MENU_ROW_BASE}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onOpenWorkflows();
                                            setIsMenuOpen(false);
                                        }}
                                    >
                                        <span className={MENU_ICON_SLOT} aria-hidden>
                                            <FiZap size={14} strokeWidth={2} />
                                        </span>
                                        <span>Workflows</span>
                                    </button>
                                )}

                                {onOpenNotifications && (
                                    <button
                                        type="button"
                                        className={MENU_ROW_BASE}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onOpenNotifications();
                                            setIsMenuOpen(false);
                                        }}
                                    >
                                        <span className={MENU_ICON_SLOT} aria-hidden>
                                            <FiBell size={14} strokeWidth={2} />
                                        </span>
                                        <span>Notifications</span>
                                    </button>
                                )}

                                {onIntegrations && (
                                    <button
                                        type="button"
                                        className={MENU_ROW_BASE}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onIntegrations();
                                            setIsMenuOpen(false);
                                        }}
                                    >
                                        <span className={MENU_ICON_SLOT} aria-hidden>
                                            <FiLink size={14} strokeWidth={2} />
                                        </span>
                                        <span>Integrations</span>
                                    </button>
                                )}

                                <button
                                    type="button"
                                    className={MENU_ROW_BASE}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (theme === 'system') setTheme('light');
                                        else if (theme === 'light') setTheme('dark');
                                        else setTheme('system');
                                        setIsMenuOpen(false);
                                    }}
                                >
                                    <span className={MENU_ICON_SLOT} aria-hidden>
                                        {theme === 'light' && <FiSun size={14} strokeWidth={2} />}
                                        {theme === 'dark' && <FiMoon size={14} strokeWidth={2} />}
                                        {theme === 'system' && <FiMonitor size={14} strokeWidth={2} />}
                                    </span>
                                    <span>
                                        {theme === 'light' && 'Theme: Light'}
                                        {theme === 'dark' && 'Theme: Dark'}
                                        {theme === 'system' && 'Theme: System'}
                                    </span>
                                </button>

                                {onGiveCredits && (
                                    <button
                                        type="button"
                                        className={MENU_ROW_BASE}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onGiveCredits();
                                            setIsMenuOpen(false);
                                        }}
                                    >
                                        <span className={MENU_ICON_SLOT} aria-hidden>
                                            <FiGift size={14} strokeWidth={2} />
                                        </span>
                                        <span>Give Credits</span>
                                    </button>
                                )}

                                {onLogout && (
                                    <button
                                        type="button"
                                        className={`${MENU_ROW_BASE} text-red-600`}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onLogout();
                                            setIsMenuOpen(false);
                                        }}
                                    >
                                        <span className={MENU_ICON_SLOT} aria-hidden>
                                            <FiLogOut size={14} strokeWidth={2} />
                                        </span>
                                        <span>Logout</span>
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
});

SidebarFooter.displayName = "SidebarFooter";

export default SidebarFooter;
