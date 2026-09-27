'use client';

import React, { useEffect, useRef, useState } from "react";
import { FiBookmark, FiLogOut, FiLink, FiGift, FiFolder, FiZap, FiBell, FiMoon, FiSun, FiPlus, FiMonitor, FiShield, FiChevronRight, FiCheck, FiSettings } from 'react-icons/fi';
import { createPortal } from 'react-dom';
import { useTheme } from "@/lib/providers/ThemeProvider";
import type { ColorMode } from "@/lib/color-mode";
import { useToolPermissions } from "@/lib/hooks/useToolPermissions";
import { FEATURE_FLAGS } from "@/lib/config/features";

/** Fixed slot so mixed Feather icons (diagonal link vs square folder) align in the menu column. */
const MENU_ICON_SLOT =
    "flex size-4 shrink-0 items-center justify-center text-current [&>svg]:block opacity-75";

const MENU_ROW_BASE =
    "sidebar-menu-row group flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-sky-500/40";

const THEME_SUBMENU_ROW =
    "sidebar-menu-row group flex w-full items-center gap-2.5 rounded-lg py-2 pl-[2.25rem] pr-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-sky-500/40";

const MENU_ICON_SIZE = 15;
const MENU_ICON_STROKE = 1.75;

const THEME_OPTIONS: { value: ColorMode; label: string; icon: React.ReactNode }[] = [
    { value: 'light', label: 'Light', icon: <FiSun size={MENU_ICON_SIZE} strokeWidth={MENU_ICON_STROKE} /> },
    { value: 'dark', label: 'Dark', icon: <FiMoon size={MENU_ICON_SIZE} strokeWidth={MENU_ICON_STROKE} /> },
    { value: 'system', label: 'System', icon: <FiMonitor size={MENU_ICON_SIZE} strokeWidth={MENU_ICON_STROKE} /> },
];

function AutoApproveSafetyDialog({
    onConfirm,
    onCancel,
}: {
    onConfirm: () => void;
    onCancel: () => void;
}) {
    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                onCancel();
            }
        };
        window.addEventListener('keydown', onKeyDown, true);
        return () => window.removeEventListener('keydown', onKeyDown, true);
    }, [onCancel]);

    const overlay = (
        <div
            role="presentation"
            className="fixed inset-0 z-[10001] flex items-center justify-center bg-slate-900/50 backdrop-blur-[2px]"
            onClick={onCancel}
        >
            <div
                role="alertdialog"
                aria-modal="true"
                aria-labelledby="auto-approve-warning-title"
                className="mx-4 w-full max-w-md rounded-xl bg-white p-5 shadow-2xl dark:bg-slate-900"
                onClick={(e) => e.stopPropagation()}
            >
                <h2 id="auto-approve-warning-title" className="text-lg font-semibold text-gray-900 dark:text-slate-50">
                    Auto-approve all tools?
                </h2>
                <p className="mt-2 text-sm text-gray-600 dark:text-slate-300">
                    The assistant will be able to run tools without asking — including commands on your
                    device, file changes, emails, and other actions that alter data. Only turn this on if
                    you trust the current session.
                </p>
                <div className="mt-5 flex justify-end gap-2">
                    <button
                        type="button"
                        className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
                        onClick={onCancel}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        className="rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700"
                        onClick={onConfirm}
                    >
                        Turn on auto-approve
                    </button>
                </div>
            </div>
        </div>
    );

    if (typeof document === 'undefined') {
        return null;
    }
    return createPortal(overlay, document.getElementById('modal-root') ?? document.body);
}

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
    onOpenToolPermissions?: () => void;
}

const SidebarFooter = React.memo<SidebarFooterProps>(({ wallet, onAddCredits, onShowSavedChats, onOpenMyFiles, onOpenWorkflows, onOpenNotifications, onIntegrations, onGiveCredits, onLogout, openMenuSignal, onOpenToolPermissions }) => {
    const [showTooltip, setShowTooltip] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [showThemeSubmenu, setShowThemeSubmenu] = useState(false);
    const [showAutoApproveWarning, setShowAutoApproveWarning] = useState(false);
    const { theme, setTheme } = useTheme();
    const menuRef = useRef<HTMLDivElement>(null);
    const { state: toolPermissionState, setAutoApproveAll } = useToolPermissions();

    useEffect(() => {
        if (openMenuSignal === undefined || openMenuSignal < 1) return;
        setIsMenuOpen(true);
    }, [openMenuSignal]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false);
                setShowThemeSubmenu(false);
            }
        };
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

    const handleAutoApproveToggle = () => {
        const next = !(toolPermissionState?.autoApproveAll ?? false);
        if (next) {
            setShowAutoApproveWarning(true);
            return;
        }
        setAutoApproveAll(false);
    };

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
                className="flex w-full items-center justify-between px-3 py-2 text-xs"
                style={{
                    backgroundColor: "var(--sidebar-bg)",
                    borderTop: "1px solid var(--sidebar-border)",
                    color: "var(--sidebar-muted-fg)",
                }}
                aria-label="Nobox"
            >
                <div className="relative">
                    <span
                        className="flex cursor-help items-center gap-1 text-[11.5px] font-medium"
                        style={{ color: "var(--sidebar-muted-fg)" }}
                        onMouseEnter={() => setShowTooltip(true)}
                        onMouseLeave={() => setShowTooltip(false)}
                    >
                        <svg
                            width="11"
                            height="11"
                            viewBox="0 0 20 20"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                            className="shrink-0"
                        >
                            <path
                                d="M11.3 1.046a1 1 0 0 1 .7 1.054l-.3 5.9h4.3a1 1 0 0 1 .8 1.6l-8 10.5a1 1 0 0 1-1.8-.8l.3-5.8H3.1a1 1 0 0 1-.8-1.6l8-10.5a1 1 0 0 1 .9-.354z"
                                fill="#FECB00"
                            />
                        </svg>
                        by <span className="font-bold tracking-wide text-[#FECB00]">Nobox</span>
                    </span>

                    {showTooltip && (
                        <div className="absolute bottom-full left-0 z-50 translate-y-[-8px] transform whitespace-nowrap rounded-lg bg-[#0F172A] px-3 py-2 text-xs text-white shadow-lg">
                            Email us at nobox.hq@gmail.com
                            <div className="absolute left-4 top-full h-0 w-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-[#0F172A]" />
                        </div>
                    )}
                </div>

                <div className="flex shrink-0 items-center gap-2" ref={menuRef}>
                    <button
                        type="button"
                        aria-label="Settings"
                        aria-haspopup="menu"
                        aria-expanded={isMenuOpen}
                        className="flex h-7 w-7 items-center justify-center rounded-lg transition-colors hover:[background-color:var(--sidebar-menu-row-hover)] focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/40"
                        style={{ color: isMenuOpen ? "var(--sidebar-fg)" : "var(--sidebar-muted-fg)" }}
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsMenuOpen((open) => {
                                if (open) setShowThemeSubmenu(false);
                                return !open;
                            });
                        }}
                        title="Settings"
                    >
                        <FiSettings size={14} strokeWidth={1.75} />
                    </button>

                    {isMenuOpen && (
                        <div
                            className="sidebar-settings-menu absolute bottom-full left-2 right-2 z-[999] mb-2 rounded-xl px-1.5 py-1.5 shadow-[0_8px_32px_-8px_rgba(0,0,0,0.35),0_2px_8px_-2px_rgba(0,0,0,0.15)]"
                            style={{
                                backgroundColor: "var(--sidebar-menu-bg)",
                                border: "1px solid var(--sidebar-border)",
                            }}
                        >
                            <div className="flex flex-col gap-0.5">
                                {walletFormatted !== null && (
                                    <div
                                        className="mb-1 flex items-center justify-between gap-2 rounded-lg px-2.5 py-2"
                                        style={{
                                            background: "color-mix(in srgb, var(--sidebar-menu-row-hover) 60%, transparent)",
                                            border: "1px solid var(--sidebar-border)",
                                        }}
                                    >
                                        <div className="flex items-center gap-2">
                                            <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--sidebar-muted-fg)" }}>Credits</span>
                                        </div>
                                        <div className="flex min-w-0 items-center gap-2">
                                            <span className="sidebar-settings-value">{walletFormatted}</span>
                                            <button
                                                type="button"
                                                className="flex shrink-0 items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold transition-colors hover:[background-color:var(--sidebar-menu-row-hover)] focus:outline-none focus-visible:ring-1 focus-visible:ring-sky-500/40"
                                                style={{ color: "var(--sidebar-fg)", background: "var(--sidebar-menu-bg)", border: "1px solid var(--sidebar-border)" }}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onAddCredits();
                                                    setIsMenuOpen(false);
                                                }}
                                            >
                                                <FiPlus size={11} strokeWidth={2} />
                                                <span>Add</span>
                                            </button>
                                        </div>
                                    </div>
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
                                            <FiBookmark size={MENU_ICON_SIZE} strokeWidth={MENU_ICON_STROKE} />
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
                                            <FiFolder size={MENU_ICON_SIZE} strokeWidth={MENU_ICON_STROKE} />
                                        </span>
                                        <span>My files</span>
                                    </button>
                                )}

                                {FEATURE_FLAGS.WORKFLOWS && onOpenWorkflows && (
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
                                            <FiZap size={MENU_ICON_SIZE} strokeWidth={MENU_ICON_STROKE} />
                                        </span>
                                        <span>Workflows</span>
                                    </button>
                                )}

                                {FEATURE_FLAGS.WORKFLOWS && onOpenNotifications && (
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
                                            <FiBell size={MENU_ICON_SIZE} strokeWidth={MENU_ICON_STROKE} />
                                        </span>
                                        <span>Notifications</span>
                                    </button>
                                )}

                                {FEATURE_FLAGS.INTEGRATIONS && onIntegrations && (
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
                                            <FiLink size={MENU_ICON_SIZE} strokeWidth={MENU_ICON_STROKE} />
                                        </span>
                                        <span>Integrations</span>
                                    </button>
                                )}

                                {onOpenToolPermissions && (
                                    <button
                                        type="button"
                                        className={MENU_ROW_BASE}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onOpenToolPermissions();
                                            setIsMenuOpen(false);
                                        }}
                                    >
                                        <span className={MENU_ICON_SLOT} aria-hidden>
                                            <FiShield size={MENU_ICON_SIZE} strokeWidth={MENU_ICON_STROKE} />
                                        </span>
                                        <span>Tool permissions</span>
                                    </button>
                                )}

                                <div>
                                    <button
                                        type="button"
                                        className={`${MENU_ROW_BASE} justify-between`}
                                        aria-haspopup="menu"
                                        aria-expanded={showThemeSubmenu}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setShowThemeSubmenu((open) => !open);
                                        }}
                                    >
                                        <span className="flex min-w-0 items-center gap-2.5">
                                            <span className={MENU_ICON_SLOT} aria-hidden>
                                                {theme === 'light' && <FiSun size={MENU_ICON_SIZE} strokeWidth={MENU_ICON_STROKE} />}
                                                {theme === 'dark' && <FiMoon size={MENU_ICON_SIZE} strokeWidth={MENU_ICON_STROKE} />}
                                                {theme === 'system' && <FiMonitor size={MENU_ICON_SIZE} strokeWidth={MENU_ICON_STROKE} />}
                                            </span>
                                            <span>Appearance</span>
                                        </span>
                                        <FiChevronRight
                                            size={14}
                                            strokeWidth={2}
                                            className={`shrink-0 opacity-50 transition-transform ${showThemeSubmenu ? 'rotate-90' : ''}`}
                                            aria-hidden
                                        />
                                    </button>

                                    {showThemeSubmenu && (
                                        <div role="menu" aria-label="Appearance" className="mb-0.5 mt-0.5 flex flex-col gap-0.5">
                                            {THEME_OPTIONS.map((option) => {
                                                const isActive = theme === option.value;
                                                return (
                                                    <button
                                                        key={option.value}
                                                        type="button"
                                                        role="menuitemradio"
                                                        aria-checked={isActive}
                                                        className={`${THEME_SUBMENU_ROW} ${isActive ? 'sidebar-menu-row--active' : ''}`}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setTheme(option.value);
                                                            setShowThemeSubmenu(false);
                                                            setIsMenuOpen(false);
                                                        }}
                                                    >
                                                        <span className={MENU_ICON_SLOT} aria-hidden>
                                                            {option.icon}
                                                        </span>
                                                        <span className="flex-1">{option.label}</span>
                                                        {isActive && (
                                                            <FiCheck size={13} strokeWidth={2.5} className="shrink-0 opacity-70" aria-hidden />
                                                        )}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>

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
                                            <FiGift size={MENU_ICON_SIZE} strokeWidth={MENU_ICON_STROKE} />
                                        </span>
                                        <span>Give Credits</span>
                                    </button>
                                )}

                                {onLogout && (
                                    <button
                                        type="button"
                                        className={`${MENU_ROW_BASE} sidebar-menu-row--danger`}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onLogout();
                                            setIsMenuOpen(false);
                                        }}
                                    >
                                        <span className={MENU_ICON_SLOT} aria-hidden>
                                            <FiLogOut size={MENU_ICON_SIZE} strokeWidth={MENU_ICON_STROKE} />
                                        </span>
                                        <span>Logout</span>
                                    </button>
                                )}

                                <div
                                    className="my-1.5 border-t"
                                    style={{ borderColor: "var(--sidebar-border)" }}
                                />

                                <button
                                    type="button"
                                    role="menuitemcheckbox"
                                    aria-checked={toolPermissionState?.autoApproveAll ?? false}
                                    aria-label="Auto-approve all tools"
                                    className={`${MENU_ROW_BASE} w-full cursor-pointer justify-between`}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleAutoApproveToggle();
                                    }}
                                >
                                    <span className="flex min-w-0 items-center gap-2.5">
                                        <span className={MENU_ICON_SLOT} aria-hidden>
                                            <FiZap size={MENU_ICON_SIZE} strokeWidth={MENU_ICON_STROKE} />
                                        </span>
                                        <span>Auto-approve</span>
                                    </span>
                                    <span
                                        aria-hidden="true"
                                        className={[
                                            "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors pointer-events-none",
                                            toolPermissionState?.autoApproveAll
                                                ? "bg-sky-500"
                                                : "bg-[color-mix(in_srgb,var(--sidebar-fg)_30%,transparent)]",
                                        ].join(" ")}
                                    >
                                        <span
                                            className={[
                                                "inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform",
                                                toolPermissionState?.autoApproveAll
                                                    ? "translate-x-[1.125rem]"
                                                    : "translate-x-0.5",
                                            ].join(" ")}
                                        />
                                    </span>
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {showAutoApproveWarning && (
                <AutoApproveSafetyDialog
                    onCancel={() => setShowAutoApproveWarning(false)}
                    onConfirm={() => {
                        setAutoApproveAll(true);
                        setShowAutoApproveWarning(false);
                    }}
                />
            )}
        </div>
    );
});

SidebarFooter.displayName = "SidebarFooter";

export default SidebarFooter;
