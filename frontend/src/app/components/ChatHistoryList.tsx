import React, { useMemo, useState, useCallback, useRef, useEffect } from "react";
import { FiInfo, FiPlus } from "react-icons/fi";
import ChatHistoryListItem from "./ChatHistoryListItem";
import { ChatSession } from '@/app/components/model-interface/shared/types';
import { ConfirmationModal } from './ChatHistoryListItem/components/ConfirmationModal';
import { ChatLoadingIndicator } from "./model-interface/features/chat/components";
import { groupSidebarSessionsByProject, sortSidebarSessions } from "./ChatHistoryList/chatHistoryListGrouping";
import type { CodeProject } from "@/lib/calls/code-projects";

/** Max conversations shown per sidebar section before "Open more". */
const SIDEBAR_SESSION_PREVIEW_LIMIT = 5;

function SidebarSectionHeader({ label }: { label: string }) {
    return (
        <div className="px-3 pb-0.5 pt-2 first:pt-1">
            <span
                className="sidebar-section-label font-medium uppercase"
                style={{ color: "var(--sidebar-muted-fg)" }}
            >
                {label}
            </span>
        </div>
    );
}

function ProjectSectionHeader({
    label,
    isActive = false,
    hasActiveChat = false,
    showInfo = false,
    conversationCount = 0,
    isCollapsed = false,
    onSelect,
    onToggleCollapse,
    onInfo,
    onNewChat,
}: {
    label: string;
    isActive?: boolean;
    /** True when this project section contains the currently open conversation inline. */
    hasActiveChat?: boolean;
    showInfo?: boolean;
    conversationCount?: number;
    isCollapsed?: boolean;
    onSelect?: () => void;
    onToggleCollapse?: () => void;
    onInfo?: () => void;
    onNewChat?: () => void;
}) {
    const handleLabelClick = () => {
        onToggleCollapse?.();
    };

    const countLabel = conversationCount === 1 ? '1 chat' : `${conversationCount} chats`;

    const buildTitle = () => {
        if (isCollapsed) return `${label} — click to expand`;
        if (hasActiveChat) return `${label} (active chat open)`;
        if (isActive) return `${label} (draft in this project) — click to collapse`;
        return `${label} — click to collapse`;
    };

    return (
        <div
            className="flex items-start gap-1 px-2 pb-0.5 pt-2 first:pt-1"
            style={{
                ...(isActive ? { backgroundColor: "var(--sidebar-icon-btn-hover-bg)" } : {}),
                ...(hasActiveChat
                    ? { borderLeft: "2px solid var(--sidebar-fg, #e2e8f0)", paddingLeft: "6px" }
                    : {}),
            }}
        >
            <div className="min-w-0 flex-1">
                <button
                    type="button"
                    onClick={handleLabelClick}
                    className="w-full truncate rounded px-1 py-0.5 text-left sidebar-section-label font-medium uppercase transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-sky-500/40"
                    style={{ color: "var(--sidebar-muted-fg)" }}
                    title={buildTitle()}
                >
                    {label}
                </button>
                {isCollapsed ? (
                    <p
                        className="px-1 pb-0.5 text-[10px] leading-tight tabular-nums"
                        style={{ color: "var(--sidebar-muted-fg)", opacity: 0.65 }}
                    >
                        {conversationCount > 0 ? countLabel : 'No chats'}
                    </p>
                ) : null}
            </div>
            <div className="flex shrink-0 items-center gap-0.5 pt-0.5">
                {showInfo && onInfo ? (
                    <button
                        type="button"
                        aria-label={`${label} details`}
                        title={`${label} details`}
                        onClick={onInfo}
                        className="rounded p-0.5 opacity-70 transition hover:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-sky-500/40"
                        style={{ color: "var(--sidebar-muted-fg)" }}
                    >
                        <FiInfo className="h-3.5 w-3.5" aria-hidden />
                    </button>
                ) : null}
                {onNewChat ? (
                    <button
                        type="button"
                        aria-label={`New chat in ${label}`}
                        title={`New chat in ${label}`}
                        onClick={onNewChat}
                        className="shrink-0 rounded p-0.5 text-sky-400 transition hover:text-sky-300 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-sky-500/40"
                    >
                        <FiPlus className="h-3.5 w-3.5" aria-hidden />
                    </button>
                ) : null}
            </div>
        </div>
    );
}

interface Model {
    id: string;
    name: string;
    description: string;
    context_length: number;
    architecture?: { modality?: string, input_modalities?: string[], output_modalities?: string[] };
    pricing?: Record<string, string>;
    [key: string]: any;
}

interface ChatHistoryListProps {
    chatHistory: (ChatSession & { id?: string })[];
    currentSessionId: string | null;
    models: Model[];
    isMobile: boolean;
    removeChatHistorySession: (id: string) => Promise<boolean>;
    removeChatHistorySessionById?: (id: string) => Promise<boolean>;
    setChatHistory: (sessions: ChatSession[]) => void;
    getChatHistory: () => Promise<ChatSession[]>;
    setSelectedModel: (model: Model) => void;
    onStarToggle: (sessionId: string, isStarred: boolean) => Promise<void>;
    onPublish?: (session: ChatSession, isRepublishing?: boolean, existingUrl?: string) => void;
    // New session management functions
    handleSessionSwitch?: (session: ChatSession) => void;
    isSessionActive?: (sessionId: string) => boolean;
    isSessionInFlight?: (sessionId: string) => boolean;
    onSessionSelect?: () => void;
    isInitialLoading?: boolean;
    codeProjects?: CodeProject[];
    activeProjectId?: string | null;
    onNewChatForProject?: (projectId: string | null) => void;
    onSelectProject?: (projectId: string | null) => void;
    onProjectInfo?: (projectId: string) => void;
}

const ChatHistoryList = React.memo<ChatHistoryListProps>(({
    chatHistory,
    currentSessionId,
    models,
    isMobile,
    removeChatHistorySession,
    removeChatHistorySessionById,
    setChatHistory,
    setSelectedModel,
    onStarToggle,
    onPublish,
    handleSessionSwitch,
    isSessionActive,
    isSessionInFlight,
    onSessionSelect,
    isInitialLoading = false,
    codeProjects = [],
    activeProjectId = null,
    onNewChatForProject,
    onSelectProject,
    onProjectInfo,
}) => {
    // Centralized Modal State
    const [actionSession, setActionSession] = useState<ChatSession | null>(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showStarModal, setShowStarModal] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    // Track processing IDs for local item loading states
    const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
    const [sessionsExpandedByKey, setSessionsExpandedByKey] = useState<Record<string, boolean>>({});
    const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

    const toggleSectionCollapsed = useCallback((sectionKey: string) => {
        setCollapsedSections((prev) => ({
            ...prev,
            [sectionKey]: !(prev[sectionKey] ?? true),
        }));
    }, []);

    const toggleSessionsExpanded = useCallback((sectionKey: string) => {
        setSessionsExpandedByKey((prev) => ({
            ...prev,
            [sectionKey]: !prev[sectionKey],
        }));
    }, []);

    const rowIsActive = useCallback(
        (session: ChatSession) => {
            const sid = session.id || "";
            return isSessionActive ? isSessionActive(sid) : sid === currentSessionId;
        },
        [currentSessionId, isSessionActive],
    );

    const rowIsGenerating = useCallback(
        (session: ChatSession) => {
            const sid = session.id || "";
            return sid ? Boolean(isSessionInFlight?.(sid)) : false;
        },
        [isSessionInFlight],
    );

    const sortedSessions = useMemo(
        () => sortSidebarSessions(chatHistory || []),
        [chatHistory],
    );

    const activeSession = useMemo(
        () => sortedSessions.find((s) => rowIsActive(s)) ?? null,
        [sortedSessions, rowIsActive],
    );

    const activeSessionId = activeSession?.id ?? null;

    // Only show "Open Now" for non-project conversations.
    // Project conversations stay inline within their project section.
    // Also check activeProjectId for sessions not yet persisted with codeProjectId.
    const pinnedSession = useMemo(
        () => {
            if (!activeSession) return null;
            // Explicitly scoped to a project — stays inline
            if (activeSession.codeProjectId) return null;
            // Active project set for the current session — stays inline
            if (activeProjectId && activeSessionId === activeSession.id) return null;
            return activeSession;
        },
        [activeSession, activeProjectId, activeSessionId],
    );

    const pinnedSessionId = pinnedSession?.id ?? null;

    const projectBuckets = useMemo(
        () => (codeProjects.length > 0
            ? groupSidebarSessionsByProject(sortedSessions, codeProjects, {
                activeSessionId: activeSessionId,
                activeProjectId,
            })
            : []),
        [sortedSessions, codeProjects, activeSessionId, activeProjectId],
    );

    const useProjectLayout = codeProjects.length > 0;

    // Ref for the scrollable conversation list container
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    // Prevents re-scrolling on every re-render — only scroll once on mount/reload
    const hasScrolledRef = useRef(false);



    // After initial render, scroll the active session into view
    useEffect(() => {
        if (hasScrolledRef.current || isInitialLoading) return;
        // Short delay so the full list (incl. auto-expanded sections) is laid out
        const timer = setTimeout(() => {
            const container = scrollContainerRef.current;
            if (!container) return;
            const activeEl = container.querySelector<HTMLElement>('[data-active-session]');
            if (activeEl) {
                activeEl.scrollIntoView({ block: 'center', behavior: 'auto' });
                hasScrolledRef.current = true;
            }
        }, 150);
        return () => clearTimeout(timer);
    }, [isInitialLoading, activeSessionId]);

    // Stable Handlers
    const handleSelect = useCallback((session: ChatSession) => {
        // 1. Immediate UI Switch
        if (handleSessionSwitch) {
            handleSessionSwitch(session);
        }

        // 2. Defer model state restoration
        React.startTransition(() => {
            const sessionModelId = session.modelId || session.messages?.[session.messages.length - 1]?.modelId;
            if (sessionModelId) {
                const restoredModel = models?.find(m => m.id === sessionModelId);
                if (restoredModel) setSelectedModel(restoredModel);
            }

            if (onSessionSelect) {
                onSessionSelect();
            }
        });
    }, [handleSessionSwitch, models, setSelectedModel, onSessionSelect]);

    const handleStarRequest = useCallback((session: ChatSession) => {
        if (isMobile) {
            setActionSession(session);
            setShowStarModal(true);
        } else {
            // Immediate toggle on desktop
            const sid = session.id;
            if (!sid) return;

            setProcessingIds(prev => new Set(prev).add(sid));
            onStarToggle(sid, !session.starred)
                .finally(() => {
                    setProcessingIds(prev => {
                        const next = new Set(prev);
                        next.delete(sid);
                        return next;
                    });
                });
        }
    }, [isMobile, onStarToggle]);

    const handleDeleteRequest = useCallback((session: ChatSession) => {
        setActionSession(session);
        // Delete always asks for confirmation
        setShowDeleteModal(true);
    }, []);

    const handlePublishRequest = useCallback((session: ChatSession) => {
        if (onPublish) {
            onPublish(session);
        }
    }, [onPublish]);

    // Modal Confirmation Handlers
    const confirmDelete = async () => {
        if (!actionSession?.id) return;
        setIsProcessing(true);
        try {
            if (removeChatHistorySessionById) {
                await removeChatHistorySessionById(actionSession.id);
            } else {
                await removeChatHistorySession(actionSession.id);
            }
            setShowDeleteModal(false);
            setActionSession(null);
        } finally {
            setIsProcessing(false);
        }
    };

    const confirmStar = async () => {
        if (!actionSession?.id) return;
        setIsProcessing(true);
        try {
            await onStarToggle(actionSession.id, !actionSession.starred);
            setShowStarModal(false);
            setActionSession(null);
        } finally {
            setIsProcessing(false);
        }
    };

    const renderRow = (session: ChatSession, isActive: boolean) => {
        const sessionId = session.id || "";
        return (
            <ChatHistoryListItem
                key={sessionId || `session-${session.title}`}
                session={session}
                isActive={isActive}
                isGenerating={rowIsGenerating(session)}
                models={models}
                onSelect={handleSelect}
                onStarRequest={handleStarRequest}
                onDeleteRequest={handleDeleteRequest}
                onPublishRequest={handlePublishRequest}
                isStarred={session.starred || false}
                isPublished={session.isPublished || false}
                isMobile={isMobile}
                isDeleting={isProcessing && actionSession?.id === sessionId && showDeleteModal}
                isStarring={
                    (isProcessing && actionSession?.id === sessionId && showStarModal) ||
                    processingIds.has(sessionId)
                }
            />
        );
    };

    const renderFlatSessionList = (
        sessions: ChatSession[],
        sectionKey: string,
        opts?: { truncate?: boolean; emptyHint?: string },
    ) => {
        const emptyHint = opts?.emptyHint;

        if (!sessions.length) {
            return (
                <p
                    className="px-3 pb-2 text-[11px] leading-snug"
                    style={{ color: "var(--sidebar-muted-fg)" }}
                >
                    {emptyHint ?? "No chats yet — use + to start one."}
                </p>
            );
        }

        const shouldTruncate = Boolean(
            opts?.truncate && sessions.length > SIDEBAR_SESSION_PREVIEW_LIMIT,
        );
        const isSessionsExpanded = sessionsExpandedByKey[sectionKey] ?? false;
        let visibleSessions = shouldTruncate && !isSessionsExpanded
            ? sessions.slice(0, SIDEBAR_SESSION_PREVIEW_LIMIT)
            : sessions;

        // Keep the open conversation visible even when the section is truncated.
        if (shouldTruncate && !isSessionsExpanded && activeSessionId) {
            const activeInSection = sessions.find((s) => s.id === activeSessionId);
            if (activeInSection && !visibleSessions.some((s) => s.id === activeSessionId)) {
                visibleSessions = [...visibleSessions, activeInSection];
            }
        }

        // Keep background in-flight conversations visible so users can return to them.
        if (shouldTruncate && !isSessionsExpanded && isSessionInFlight) {
            for (const session of sessions) {
                const sid = session.id || "";
                if (!sid || !isSessionInFlight(sid)) {
                    continue;
                }
                if (!visibleSessions.some((s) => s.id === sid)) {
                    visibleSessions = [...visibleSessions, session];
                }
            }
        }

        const hiddenCount = sessions.length - visibleSessions.length;

        return (
            <>
                <ul className="m-0 list-none space-y-0 px-3 pb-1">
                    {visibleSessions.map((session) => renderRow(session, rowIsActive(session)))}
                </ul>
                {shouldTruncate && !isSessionsExpanded && hiddenCount > 0 ? (
                    <button
                        type="button"
                        onClick={() => toggleSessionsExpanded(sectionKey)}
                        className="mb-1.5 w-full px-3 py-0.5 text-left text-[11px] transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-sky-500/40"
                        style={{ color: "var(--sidebar-muted-fg)", opacity: 0.8 }}
                    >
                        Open more ({hiddenCount})
                    </button>
                ) : null}
            </>
        );
    };

    return (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            {/* === "Open Now" section — commented out, keeping code for easy revert ===
            {pinnedSession ? (
                <div className="shrink-0 px-0 pb-1">
                    <SidebarSectionHeader label="Open now" />
                    <ul className="m-0 list-none space-y-0.5 px-3 pb-0.5">
                        {renderRow(pinnedSession, true)}
                    </ul>
                </div>
            ) : null}
            === end "Open Now" section === */}

            <div ref={scrollContainerRef} className="conversation-list-scroll flex min-h-0 flex-1 flex-col overflow-y-auto pb-10">
                <ChatLoadingIndicator isLoading={isInitialLoading} />
                {useProjectLayout ? (
                    projectBuckets.map((bucket) => {
                        const sectionKey = bucket.projectId ?? 'general';
                        const hasInlineActive = bucket.hasActiveSession;
                        const isCollapsed = hasInlineActive
                            ? false
                            : (collapsedSections[sectionKey] ?? true);

                        return (
                        <div key={sectionKey} className="mb-1">
                            <ProjectSectionHeader
                                label={bucket.label}
                                conversationCount={bucket.conversationCount}
                                isCollapsed={isCollapsed}
                                hasActiveChat={hasInlineActive}
                                isActive={
                                    bucket.projectId
                                        ? hasInlineActive
                                            || (!activeSessionId && activeProjectId === bucket.projectId)
                                        : hasInlineActive
                                            || (!activeSessionId && activeProjectId == null)
                                }
                                showInfo={bucket.projectId != null}
                                onToggleCollapse={
                                    // Prevent collapsing when the active chat is inline
                                    hasInlineActive
                                        ? undefined
                                        : () => toggleSectionCollapsed(sectionKey)
                                }
                                onInfo={
                                    bucket.projectId && onProjectInfo
                                        ? () => onProjectInfo(bucket.projectId as string)
                                        : undefined
                                }
                                onNewChat={
                                    onNewChatForProject
                                        ? () => onNewChatForProject(bucket.projectId)
                                        : undefined
                                }
                            />
                            {!isCollapsed
                                ? renderFlatSessionList(
                                    bucket.sessions,
                                    sectionKey,
                                    { truncate: true },
                                )
                                : null}
                        </div>
                        );
                    })
                ) : (
                    renderFlatSessionList(sortedSessions, 'flat', { truncate: true })
                )}
            </div>

            <ConfirmationModal
                isOpen={showDeleteModal}
                isProcessing={isProcessing}
                title="Delete this chat?"
                processingTitle="Deleting chat..."
                confirmText="Delete"
                processingText="Deleting..."
                confirmButtonColor="red"
                onConfirm={confirmDelete}
                onCancel={() => setShowDeleteModal(false)}
            />

            <ConfirmationModal
                isOpen={showStarModal}
                isProcessing={isProcessing}
                title={actionSession?.starred ? "Unstar this chat?" : "Star this chat?"}
                processingTitle={actionSession?.starred ? "Unstarring chat..." : "Starring chat..."}
                confirmText={actionSession?.starred ? "Unstar" : "Star"}
                processingText={actionSession?.starred ? "Unstarring..." : "Starring..."}
                confirmButtonColor={actionSession?.starred ? "gray" : "yellow"}
                onConfirm={confirmStar}
                onCancel={() => setShowStarModal(false)}
            />
        </div>
    );
});

ChatHistoryList.displayName = "ChatHistoryList";

export default ChatHistoryList;
