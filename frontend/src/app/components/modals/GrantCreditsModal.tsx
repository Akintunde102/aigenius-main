"use client";
import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { FiGift, FiX, FiClock, FiChevronRight } from "react-icons/fi";
import { serverCall } from "@/servercall/init";
import { serverCalls } from "@/servercall/store";
import { getAdminCreditsHistory, CreditGrantRecord, searchAdminUsers, AdminUserSearchResult } from "@/lib/calls/admin";
import toast from "react-hot-toast";
import { clearUserDetailsCache } from "@/lib/calls/get-logged-user-details";

function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);
    useEffect(() => {
        const handler = setTimeout(() => setDebouncedValue(value), delay);
        return () => clearTimeout(handler);
    }, [value, delay]);
    return debouncedValue;
}

interface GrantCreditsModalProps {
    onClose: () => void;
    onWalletUpdate?: () => Promise<void>;
}

type Tab = "give" | "history";

function formatDate(raw: string | null): string {
    if (!raw) return "—";
    try {
        return new Date(raw).toLocaleString();
    } catch {
        return raw;
    }
}

const GrantCreditsModal: React.FC<GrantCreditsModalProps> = ({ onClose, onWalletUpdate }) => {
    const [tab, setTab] = useState<Tab>("give");

    // ── Give tab state ──────────────────────────────────────────────────────
    const [searchTerm, setSearchTerm] = useState("");
    const debouncedSearchTerm = useDebounce(searchTerm, 150);
    const [selectedUser, setSelectedUser] = useState<AdminUserSearchResult | null>(null);
    const [searchResults, setSearchResults] = useState<AdminUserSearchResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    const searchCache = React.useRef<Record<string, AdminUserSearchResult[]>>({});

    const [amount, setAmount] = useState("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const term = debouncedSearchTerm.trim().toLowerCase();
        if (term === "" || selectedUser?.email === debouncedSearchTerm) {
            setSearchResults([]);
            setIsSearching(false);
            return;
        }

        if (searchCache.current[term]) {
            setSearchResults(searchCache.current[term]);
            setIsSearching(false);
            return;
        }

        let isMounted = true;
        setIsSearching(true);
        searchAdminUsers(term)
            .then((res) => {
                if (isMounted) {
                    setSearchResults(res);
                    searchCache.current[term] = res;
                    setIsSearching(false);
                }
            })
            .catch(() => {
                if (isMounted) setIsSearching(false);
            });
        return () => {
            isMounted = false;
        };
    }, [debouncedSearchTerm, selectedUser]);

    // ── History tab state ───────────────────────────────────────────────────
    const [history, setHistory] = useState<CreditGrantRecord[]>([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [historyError, setHistoryError] = useState<string | null>(null);

    const loadHistory = async () => {
        setHistoryLoading(true);
        setHistoryError(null);
        try {
            const rows = await getAdminCreditsHistory();
            setHistory(rows);
        } catch (e: any) {
            setHistoryError(e?.message || "Failed to load history");
        } finally {
            setHistoryLoading(false);
        }
    };

    useEffect(() => {
        if (tab === "history") loadHistory();
    }, [tab]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key !== "Escape") return;
            e.preventDefault();
            e.stopPropagation();
            onClose();
        };
        window.addEventListener("keydown", handleKeyDown, true);
        return () => window.removeEventListener("keydown", handleKeyDown, true);
    }, [onClose]);

    const canSubmit =
        selectedUser !== null &&
        amount.trim() !== "" &&
        !isNaN(Number(amount)) &&
        Number(amount) > 0 &&
        !loading;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!canSubmit) return;
        setLoading(true);
        try {
            await serverCall({
                serverCallProps: {
                    call: serverCalls.postGatewayAdminGrantCredits,
                    data: {
                        targetEmail: selectedUser!.email.trim().toLowerCase(),
                        amount: String(Math.round(Number(amount))),
                    },
                },
                authorized: true,
            });
            toast.success(`✅ ${amount} credits granted to ${selectedUser!.email}`);
            setSearchTerm("");
            setSelectedUser(null);
            setAmount("");
            if (onWalletUpdate) {
                clearUserDetailsCache();
                await onWalletUpdate();
            }
            onClose();
        } catch (err: any) {
            const message =
                err?.response?.data?.message ||
                err?.message ||
                "Failed to grant credits";
            toast.error(message);
        } finally {
            setLoading(false);
        }
    };

    const overlay = (
        <div
            role="presentation"
            className="app-modal-overlay animate-fadeIn"
            onClick={onClose}
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="grant-credits-modal-title"
                className="app-modal-panel max-w-md animate-slideUp"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="app-modal-panel-header">
                    <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                            <div
                                className="app-surface-card flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
                                style={{ color: "var(--modal-fg)" }}
                                aria-hidden
                            >
                                <FiGift size={20} strokeWidth={1.75} />
                            </div>
                            <div className="min-w-0">
                                <h2
                                    id="grant-credits-modal-title"
                                    className="text-base font-semibold leading-snug"
                                >
                                    Grant credits
                                </h2>
                                <p className="mt-0.5 text-xs" style={{ color: "var(--modal-muted-fg)" }}>
                                    Add credits to a user&apos;s wallet (admin)
                                </p>
                            </div>
                        </div>
                        <button
                            type="button"
                            aria-label="Close"
                            className="shrink-0 rounded-lg p-2 transition-colors hover:[background-color:var(--sidebar-row-hover)] focus:outline-none"
                            style={{ color: "var(--modal-muted-fg)" }}
                            onClick={onClose}
                        >
                            <FiX size={18} />
                        </button>
                    </div>
                </div>

                <div className="app-modal-panel-body flex min-h-0 flex-1 flex-col">
                    <div className="-mx-5 mb-4 flex shrink-0 border-b px-5" style={{ borderColor: "var(--modal-border)" }}>
                        <button
                            type="button"
                            className={`app-modal-tab ${tab === "give" ? "app-modal-tab--active" : ""}`}
                            onClick={() => setTab("give")}
                        >
                            Grant
                        </button>
                        <button
                            type="button"
                            className={`app-modal-tab flex items-center justify-center gap-1.5 ${tab === "history" ? "app-modal-tab--active" : ""}`}
                            onClick={() => setTab("history")}
                        >
                            <FiClock size={13} />
                            History
                        </button>
                    </div>

                    <div className="min-h-0 flex-1 overflow-y-auto">
                        {/* ── Give tab ──────────────────────────────────────────────── */}
                        {tab === "give" && (
                            <form onSubmit={handleSubmit} className="space-y-4 pb-2">
                                <p className="mb-2 text-[13px] leading-relaxed" style={{ color: "var(--modal-muted-fg)" }}>
                                    Credits are added directly to the recipient&apos;s wallet. You can
                                    grant credits to yourself or any registered user.
                                </p>

                                {/* Recipient user search */}
                                <div className="relative">
                                    <label htmlFor="grant-email" className="app-modal-field-label">
                                        Select Recipient
                                    </label>
                                    <div className="relative">
                                        <input
                                            id="grant-email"
                                            type="text"
                                            placeholder="Search user by email or name…"
                                            value={searchTerm}
                                            onChange={(e) => {
                                                setSearchTerm(e.target.value);
                                                setSelectedUser(null);
                                                setShowDropdown(true);
                                            }}
                                            onFocus={() => setShowDropdown(true)}
                                            onBlur={() => setShowDropdown(false)}
                                            disabled={loading}
                                            className="app-modal-input h-11"
                                            autoComplete="off"
                                        />
                                        {isSearching && (
                                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                                <svg className="animate-spin text-gray-400" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" strokeOpacity="0.2" /><path d="M12 2a10 10 0 0 1 10 10" /></svg>
                                            </div>
                                        )}
                                    </div>

                                    {showDropdown && searchResults.length > 0 && (
                                        <ul className="app-surface-card absolute z-20 mt-1.5 max-h-56 w-full origin-top animate-dropdownSlide overflow-y-auto overflow-x-hidden rounded-lg shadow-[0_8px_30px_rgb(0,0,0,0.35)]">
                                            {searchResults.map((user) => (
                                                <li
                                                    key={user.id}
                                                    className="flex cursor-pointer flex-col border-b px-4 py-2.5 transition-colors last:border-0 hover:[background-color:var(--sidebar-row-hover)]"
                                                    style={{ borderColor: "var(--modal-border)" }}
                                                    onMouseDown={(e) => {
                                                        // Prevent blur from firing before click is processed
                                                        e.preventDefault();
                                                    }}
                                                    onClick={() => {
                                                        setSelectedUser(user);
                                                        setSearchTerm(user.email);
                                                        setShowDropdown(false);
                                                    }}
                                                >
                                                    <span className="text-sm font-semibold">{user.email}</span>
                                                    {(user.firstName || user.lastName) && (
                                                        <span className="mt-0.5 text-xs" style={{ color: "var(--modal-muted-fg)" }}>{user.firstName} {user.lastName}</span>
                                                    )}
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                    {showDropdown && searchResults.length === 0 && searchTerm.trim().length > 0 && !isSearching && !selectedUser && (
                                        <div className="app-surface-card absolute z-20 mt-1.5 w-full origin-top animate-dropdownSlide p-4 text-center text-sm" style={{ color: "var(--modal-muted-fg)" }}>
                                            No users found.
                                        </div>
                                    )}
                                </div>

                                {/* Amount */}
                                <div>
                                    <label htmlFor="grant-amount" className="app-modal-field-label">
                                        Number of Credits
                                    </label>
                                    <input
                                        id="grant-amount"
                                        type="number"
                                        min="1"
                                        placeholder="e.g. 5000"
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                        disabled={loading}
                                        className="app-modal-input h-11"
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={!canSubmit}
                                    className="app-modal-btn-primary mt-2 h-11 w-full"
                                >
                                    {loading ? (
                                        <svg
                                            className="animate-spin"
                                            width="16"
                                            height="16"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="2.5"
                                        >
                                            <circle cx="12" cy="12" r="10" strokeOpacity="0.2" />
                                            <path d="M12 2a10 10 0 0 1 10 10" />
                                        </svg>
                                    ) : (
                                        <FiGift size={16} />
                                    )}
                                    {loading ? "Granting…" : "Grant Credits"}
                                </button>
                            </form>
                        )}

                        {/* ── History tab ───────────────────────────────────────────── */}
                        {tab === "history" && (
                            <div>
                                {historyLoading ? (
                                    <div className="py-10 flex flex-col items-center justify-center">
                                        <svg className="mb-3 animate-spin" style={{ color: "var(--chat-accent)" }} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" strokeOpacity="0.2" /><path d="M12 2a10 10 0 0 1 10 10" /></svg>
                                        <span className="animate-pulse text-[13px] font-medium" style={{ color: "var(--modal-muted-fg)" }}>Loading history…</span>
                                    </div>
                                ) : historyError ? (
                                    <div className="py-8 bg-red-50/50 rounded-lg border border-red-100 flex flex-col items-center justify-center mt-2">
                                        <p className="text-[13px] text-red-500 font-medium mb-3">{historyError}</p>
                                        <button
                                            className="text-[13px] px-4 py-1.5 bg-white border border-red-200 rounded-md text-red-600 hover:bg-red-50 font-semibold transition"
                                            onClick={loadHistory}
                                        >
                                            Retry
                                        </button>
                                    </div>
                                ) : history.length === 0 ? (
                                    <div className="app-surface-card mt-2 flex flex-col items-center justify-center rounded-lg py-12">
                                        <FiGift className="mb-3" size={32} style={{ color: "var(--modal-muted-fg)" }} />
                                        <p className="text-[14px] font-medium" style={{ color: "var(--modal-muted-fg)" }}>No credits granted yet</p>
                                    </div>
                                ) : (
                                    <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1 pb-1 mt-1 scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
                                        {history.map((item) => (
                                            <div
                                                key={item.id}
                                                className="app-surface-card flex items-center justify-between rounded-lg p-3.5 transition-colors hover:[border-color:color-mix(in_srgb,var(--chat-accent)_35%,var(--modal-border))]"
                                            >
                                                <div className="min-w-0 flex-1">
                                                    <p className="mb-0.5 truncate text-[14px] font-semibold">
                                                        {item.grantedTo}
                                                    </p>
                                                    <p className="text-[11px] font-medium tracking-wide" style={{ color: "var(--modal-muted-fg)" }}>
                                                        {formatDate(item.createdAt)}
                                                    </p>
                                                </div>
                                                <div
                                                    className="ml-3 flex shrink-0 items-center gap-1.5 rounded-md border px-2 py-1"
                                                    style={{
                                                        borderColor: "var(--modal-border)",
                                                        background: "color-mix(in srgb, var(--chat-accent) 10%, var(--surface-muted))",
                                                    }}
                                                >
                                                    <span className="text-[14px] font-bold" style={{ color: "var(--credits-fg)" }}>
                                                        +{item.amount.toLocaleString()}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <div className="mt-4 flex justify-end">
                                    <button
                                        className="flex items-center gap-1 rounded-md px-3 py-1.5 text-[12px] font-medium transition-colors disabled:opacity-50 hover:[background-color:var(--sidebar-row-hover)]"
                                        style={{ color: "var(--modal-muted-fg)" }}
                                        onClick={loadHistory}
                                        disabled={historyLoading}
                                    >
                                        Refresh <FiChevronRight size={12} />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <style jsx>{`
                .animate-fadeIn { animation: fadeIn 0.4s; }
                .animate-slideUp { animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
                .animate-dropdownSlide { animation: dropdownSlide 0.2s cubic-bezier(0.16, 1, 0.3, 1); }
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes slideUp { from { transform: translateY(20px) scale(0.98); opacity: 0; } to { transform: translateY(0) scale(1); opacity: 1; } }
                @keyframes dropdownSlide { from { transform: translateY(-8px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
            `}</style>
        </div>
    );

    if (typeof document === "undefined") {
        return null;
    }

    const portalTarget =
        document.getElementById("modal-root") ?? document.body;

    return createPortal(overlay as any, portalTarget);
};

export default GrantCreditsModal;
