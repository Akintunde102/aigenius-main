import React, { useMemo, useState, useCallback } from "react";
import { FiInfo, FiPlus } from "react-icons/fi";
import ChatHistoryListItem from "./ChatHistoryListItem";
import { ChatSession } from '@/app/components/model-interface/shared/types';
import { ConfirmationModal } from './ChatHistoryListItem/components/ConfirmationModal';
import { ChatLoadingIndicator } from "./model-interface/features/chat/components";
import { groupSidebarSessionsByProject, sortSidebarSessions } from "./ChatHistoryList/chatHistoryListGrouping";
import type { CodeProject } from "@/lib/calls/code-projects";

const RECENT_INITIAL_VISIBLE = 4;

function SidebarSectionHeader({ label }: { label: string }) {
    return (
        <div className="px-3 pb-0.5 pt-2.5 first:pt-1.5">
            <span
                className="text-xs font-semibold uppercase tracking-widest"
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
    showInfo?: boolean;
    conversationCount?: number;
    isCollapsed?: boolean;
    onSelect?: () => void;
    onToggleCollapse?: () => void;
    onInfo?: () => void;
    onNewChat?: () => void;
}) {
    const selectTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

    React.useEffect(() => () => {
        if (selectTimerRef.current) clearTimeout(selectTimerRef.current);
    }, []);

    const handleLabelClick = () => {
        if (!onSelect) return;
        if (selectTimerRef.current) clearTimeout(selectTimerRef.current);
        selectTimerRef.current = setTimeout(() => {
            onSelect();
            selectTimerRef.current = null;
        }, 220);
    };

    const handleLabelDoubleClick = (event: React.MouseEvent) => {
        event.preventDefault();
        if (selectTimerRef.current) {
            clearTimeout(selectTimerRef.current);
            selectTimerRef.current = null;
        }
        onToggleCollapse?.();
    };

    const countLabel = conversationCount === 1 ? '1 chat' : `${conversationCount} chats`;

    return (
        <div
            className="flex items-start gap-1 px-2 pb-0.5 pt-2.5 first:pt-1.5"
            style={isActive ? { backgroundColor: "var(--sidebar-icon-btn-hover-bg)" } : undefined}
        >
            <div className="min-w-0 flex-1">
                <button
                    type="button"
                    onClick={handleLabelClick}
                    onDoubleClick={handleLabelDoubleClick}
                    className="w-full truncate rounded px-1 py-0.5 text-left text-xs font-semibold uppercase tracking-widest transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-sky-500/40"
                    style={{ color: "var(--sidebar-muted-fg)" }}
                    title={
                        isCollapsed
                            ? `${label} — double-click to expand`
                            : isActive
                                ? `${label} (active for new chats) — double-click to collapse`
                                : `Set ${label} as active project — double-click to collapse`
                    }
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
    const [recentExpandedByKey, setRecentExpandedByKey] = useState<Record<string, boolean>>({});
    const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

    const toggleSectionCollapsed = useCallback((sectionKey: string) => {
        setCollapsedSections((prev) => ({
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

    const sortedSessions = useMemo(
        () => sortSidebarSessions(chatHistory || []),
        [chatHistory],
    );

    const pinnedSession = useMemo(
        () => sortedSessions.find((s) => rowIsActive(s)) ?? null,
        [sortedSessions, rowIsActive],
    );

    const pinnedSessionId = pinnedSession?.id ?? null;

    const projectBuckets = useMemo(
        () => (codeProjects.length > 0
            ? groupSidebarSessionsByProject(sortedSessions, codeProjects, {
                activeSessionId: pinnedSessionId,
                activeProjectId,
            })
            : []),
        [sortedSessions, codeProjects, pinnedSessionId, activeProjectId],
    );

    const useProjectLayout = codeProjects.length > 0;

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
        emptyHint?: string,
    ) => {
        if (!sessions.length) {
            return (
                <p
                    className="px-3 pb-2 text-[12px] leading-snug"
                    style={{ color: "var(--sidebar-muted-fg)" }}
                >
                    {emptyHint ?? "No chats yet — use + to start one."}
                </p>
            );
        }

        const expanded = recentExpandedByKey[sectionKey] ?? false;
        const setExpanded = (updater: boolean | ((current: boolean) => boolean)) => {
            setRecentExpandedByKey((prev) => {
                const current = prev[sectionKey] ?? false;
                const next = typeof updater === 'function' ? updater(current) : updater;
                return { ...prev, [sectionKey]: next };
            });
        };
        const visible = expanded
            ? sessions
            : sessions.slice(0, RECENT_INITIAL_VISIBLE);
        const extraCount = Math.max(0, sessions.length - RECENT_INITIAL_VISIBLE);

        return (
            <ul className="m-0 list-none space-y-0.5 px-3 pb-1.5">
                {visible.map((session) => renderRow(session, false))}
                {extraCount > 0 ? (
                    <li className="list-none px-0 pt-0.5">
                        <button
                            type="button"
                            className="w-full rounded-md px-2 py-1 text-left text-[13px] leading-snug text-slate-500 transition-colors hover:text-slate-300 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-sky-500/40 focus-visible:ring-offset-0"
                            onClick={() => setExpanded((e) => !e)}
                        >
                            {expanded ? "...show less" : "...open more"}
                        </button>
                    </li>
                ) : null}
            </ul>
        );
    };

    return (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            {pinnedSession ? (
                <div className="shrink-0 px-0 pb-1">
                    <SidebarSectionHeader label="Open now" />
                    <ul className="m-0 list-none space-y-0.5 px-3 pb-0.5">
                        {renderRow(pinnedSession, true)}
                    </ul>
                </div>
            ) : null}

            <div className="conversation-list-scroll flex min-h-0 flex-1 flex-col overflow-y-auto pb-4">
                <ChatLoadingIndicator isLoading={isInitialLoading} />
                {useProjectLayout ? (
                    projectBuckets.map((bucket) => {
                        const sectionKey = bucket.projectId ?? 'general';
                        const isCollapsed = collapsedSections[sectionKey] ?? false;

                        return (
                        <div key={sectionKey} className="mb-1">
                            <ProjectSectionHeader
                                label={bucket.label}
                                conversationCount={bucket.conversationCount}
                                isCollapsed={isCollapsed}
                                isActive={
                                    bucket.projectId
                                        ? activeProjectId === bucket.projectId
                                        : activeProjectId == null
                                }
                                showInfo={bucket.projectId != null}
                                onSelect={
                                    onSelectProject
                                        ? () => onSelectProject(bucket.projectId)
                                        : undefined
                                }
                                onToggleCollapse={() => toggleSectionCollapsed(sectionKey)}
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
                                    bucket.hasActiveSession
                                        ? "Current chat is open above."
                                        : undefined,
                                )
                                : null}
                        </div>
                        );
                    })
                ) : (
                    renderFlatSessionList(sortedSessions, 'default')
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
