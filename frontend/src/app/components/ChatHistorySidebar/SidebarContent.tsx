import React, { type CSSProperties } from "react";
import { ChatSession, Model } from '@/app/components/model-interface/shared/types';
import ChatHistoryList from "../ChatHistoryList";

/** CSS variable name for the sidebar conversation-list background — must match globals.scss. */
const SIDEBAR_LIST_VAR = "var(--sidebar-bg-list)";
/** Conversation list — flat surface; separation comes from sidebar vs canvas tone, not texture. */
const getSidebarConversationListStyle = (): CSSProperties => ({
    backgroundColor: SIDEBAR_LIST_VAR,
});

interface SidebarContentProps {
    chatHistory: (ChatSession & { id?: string })[];
    currentSessionId: string | null;
    models: Model[];
    historySearch: string;
    removeChatHistorySession: (id: string) => Promise<boolean>;
    removeChatHistorySessionById?: (id: string) => Promise<boolean>;
    setChatHistory: (sessions: ChatSession[]) => void;
    getChatHistory: () => Promise<ChatSession[]>;
    setSelectedModel: (model: Model) => void;
    isMobile: boolean;
    setMobileSidebarOpen?: (open: boolean) => void;
    onStarToggle: (sessionId: string, isStarred: boolean) => Promise<void>;
    onPublish?: (session: ChatSession, isRepublishing?: boolean, existingUrl?: string) => void;
    handleSessionSwitch?: (session: ChatSession) => void;
    isSessionActive?: (sessionId: string) => boolean;
    isInitialLoading?: boolean;
    codeProjects?: import("@/lib/calls/code-projects").CodeProject[];
    activeProjectId?: string | null;
    onNewChatForProject?: (projectId: string | null) => void;
    onSelectProject?: (projectId: string | null) => void;
    onProjectInfo?: (projectId: string) => void;
}

const SidebarContent = React.memo<SidebarContentProps>(({
    chatHistory,
    currentSessionId,
    models,
    historySearch,
    removeChatHistorySession,
    removeChatHistorySessionById,
    setChatHistory,
    getChatHistory,
    setSelectedModel,
    isMobile,
    setMobileSidebarOpen,
    onStarToggle,
    onPublish,
    handleSessionSwitch,
    isSessionActive,
    isInitialLoading = false,
    codeProjects = [],
    activeProjectId = null,
    onNewChatForProject,
    onSelectProject,
    onProjectInfo,
}) => {
    const deferredHistorySearch = React.useDeferredValue(historySearch);

    const filteredChatHistory = React.useMemo(() => {
        const searchLower = deferredHistorySearch.trim().toLowerCase();
        if (!searchLower) return chatHistory || [];

        return (chatHistory || []).filter(session =>
            session.title?.toLowerCase().includes(searchLower)
        );
    }, [chatHistory, deferredHistorySearch]);

    const handleSessionSelect = React.useCallback(() => {
        if (isMobile && setMobileSidebarOpen) {
            setMobileSidebarOpen(false);
        }
    }, [isMobile, setMobileSidebarOpen]);

    return (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="relative flex min-h-0 flex-1 flex-col">
                {/*
                 * Top inset lives *outside* the overflow scroller so padding cannot form a transparent
                 * band where scrolled titles show through (padding on overflow elements often still
                 * lets content paint in that region).
                 */}
                <div
                    className="flex min-h-0 flex-1 flex-col overflow-hidden"
                    style={getSidebarConversationListStyle()}
                >
                    <div className="shrink-0" style={{ height: "0.3rem" }} aria-hidden />
                    <ChatHistoryList
                        chatHistory={filteredChatHistory}
                        currentSessionId={currentSessionId}
                        models={models}
                        isMobile={isMobile}
                        removeChatHistorySession={removeChatHistorySession}
                        removeChatHistorySessionById={removeChatHistorySessionById}
                        setChatHistory={setChatHistory}
                        getChatHistory={getChatHistory}
                        setSelectedModel={setSelectedModel}
                        onStarToggle={onStarToggle}
                        onPublish={onPublish}
                        handleSessionSwitch={handleSessionSwitch}
                        isSessionActive={isSessionActive}
                        onSessionSelect={handleSessionSelect}
                        isInitialLoading={isInitialLoading}
                        codeProjects={codeProjects}
                        activeProjectId={activeProjectId}
                        onNewChatForProject={onNewChatForProject}
                        onSelectProject={onSelectProject}
                        onProjectInfo={onProjectInfo}
                    />
                </div>

                <div
                    className="pointer-events-none absolute bottom-0 left-0 h-8 w-full opacity-95"
                    style={{
                        background: `linear-gradient(to top, ${SIDEBAR_LIST_VAR}, transparent)`,
                    }}
                />
            </div>

            {/*
             * Global: scrollbar pseudos must target the element that owns `conversation-list-scroll`.
             * Scoped styled-jsx on a parent (e.g. ChatHistorySidebar) does NOT apply here — that
             * caused the default white track. See styled-jsx scoping / child components.
             */}
            <style jsx global>{`
                .conversation-list-scroll {
                    scrollbar-width: thin;
                    scrollbar-color: rgba(148, 163, 184, 0.35) transparent;
                    color-scheme: light dark;
                }
                .conversation-list-scroll::-webkit-scrollbar {
                    width: 4px;
                    height: 4px;
                    background: transparent;
                }
                .conversation-list-scroll::-webkit-scrollbar-track,
                .conversation-list-scroll::-webkit-scrollbar-track-piece,
                .conversation-list-scroll::-webkit-scrollbar-corner {
                    background-color: transparent !important;
                    background: transparent !important;
                    box-shadow: none !important;
                }
                .conversation-list-scroll::-webkit-scrollbar-thumb {
                    border-radius: 999px;
                    background-color: rgba(100, 116, 139, 0.3);
                    min-height: 28px;
                }
                .conversation-list-scroll::-webkit-scrollbar-thumb:hover {
                    background-color: rgba(100, 116, 139, 0.5);
                }
            `}</style>
        </div>
    );
});

SidebarContent.displayName = "SidebarContent";

export default SidebarContent;
