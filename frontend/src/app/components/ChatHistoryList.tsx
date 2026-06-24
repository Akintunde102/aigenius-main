import React, { useMemo, useState, useCallback } from "react";
import ChatHistoryListItem from "./ChatHistoryListItem";
import { ChatSession } from '@/app/components/model-interface/shared/types';
import { ConfirmationModal } from './ChatHistoryListItem/components/ConfirmationModal';
import { ChatLoadingIndicator } from "./model-interface/features/chat/components";
import { groupSidebarSessions } from "./ChatHistoryList/chatHistoryListGrouping";

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
}) => {
    // Centralized Modal State
    const [actionSession, setActionSession] = useState<ChatSession | null>(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showStarModal, setShowStarModal] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    // Track processing IDs for local item loading states
    const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
    const [recentExpanded, setRecentExpanded] = useState(false);

    const rowIsActive = useCallback(
        (session: ChatSession) => {
            const sid = session.id || "";
            return isSessionActive ? isSessionActive(sid) : sid === currentSessionId;
        },
        [currentSessionId, isSessionActive],
    );

    const { pinnedSession, otherSessions } = useMemo(() => {
        const sorted = [...(chatHistory || [])].sort((a, b) => {
            const lastA = a.messages?.[a.messages.length - 1]?.timestamp || 0;
            const lastB = b.messages?.[b.messages.length - 1]?.timestamp || 0;
            return lastB - lastA;
        });
        const pinned = sorted.find((s) => rowIsActive(s)) ?? null;
        const pinnedId = pinned?.id || "";
        const others = pinned
            ? sorted.filter((s) => (s.id || "") !== pinnedId)
            : sorted;
        return { pinnedSession: pinned, otherSessions: others };
    }, [chatHistory, rowIsActive]);

    const groupedOthers = useMemo(
        () => groupSidebarSessions(otherSessions),
        [otherSessions],
    );

    const recentSessions = groupedOthers.recent;
    const recentVisible = recentExpanded
        ? recentSessions
        : recentSessions.slice(0, RECENT_INITIAL_VISIBLE);
    const recentExtraCount = Math.max(0, recentSessions.length - RECENT_INITIAL_VISIBLE);

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
                {groupedOthers.starred.length > 0 ? (
                    <>
                        <SidebarSectionHeader label="Starred" />
                        <ul className="m-0 list-none space-y-0.5 px-3 pb-1.5">
                            {groupedOthers.starred.map((session) => renderRow(session, false))}
                        </ul>
                    </>
                ) : null}

                {recentSessions.length > 0 ? (
                    <>
                        <SidebarSectionHeader label="Recent" />
                        <ul className="m-0 list-none space-y-0.5 px-3 pb-1.5">
                            {recentVisible.map((session) => renderRow(session, false))}
                            {recentExtraCount > 0 ? (
                                <li className="list-none px-0 pt-0.5">
                                    <button
                                        type="button"
                                        className="w-full px-2 py-1 text-left text-[13px] leading-snug text-slate-500 transition-colors hover:text-slate-300 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-sky-500/40 focus-visible:ring-offset-0 rounded-md"
                                        onClick={() => setRecentExpanded((e) => !e)}
                                    >
                                        {recentExpanded ? "...show less" : "...open more"}
                                    </button>
                                </li>
                            ) : null}
                        </ul>
                    </>
                ) : null}

                {groupedOthers.earlier.length > 0 ? (
                    <>
                        <SidebarSectionHeader label="Earlier" />
                        <ul className="m-0 list-none space-y-0.5 px-3 pb-1">
                            {groupedOthers.earlier.map((session) => renderRow(session, false))}
                        </ul>
                    </>
                ) : null}
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
