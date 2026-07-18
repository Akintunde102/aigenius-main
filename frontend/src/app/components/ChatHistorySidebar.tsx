"use client";
import React, { useEffect, useRef } from "react";
import { ChatSession, ChatMessage } from '@/app/components/model-interface/shared/types';
import { normalizeChatMessages } from '@/lib/utils/messageContentUtils';
import SidebarHeader from "./ChatHistorySidebar/SidebarHeader";
import SidebarContent from "./ChatHistorySidebar/SidebarContent";
import SidebarFooter from "./ChatHistorySidebar/SidebarFooter";
import { CodeProjectRail } from "./ChatHistorySidebar/CodeProjectRail";
import { CreateCodeProjectModal } from "./ChatHistorySidebar/CreateCodeProjectModal";
import { useCodeProjects } from "@/lib/hooks/useCodeProjects";
import { isAigeniusDesktopRuntime } from "@/lib/utils/desktop-runtime";
import WalletModal from "./ChatHistorySidebar/WalletModal";
import IntegrationsModal from "./ChatHistorySidebar/IntegrationsModal";
import ToolPermissionsModal from "./ChatHistorySidebar/ToolPermissionsModal";
import MyFilesModal from "./ChatHistorySidebar/MyFilesModal";
import GrantCreditsModal from "./modals/GrantCreditsModal";
import { getAdminStatus } from "@/lib/calls/admin";
import { SidebarCollapsedRail } from "./ChatHistorySidebar/SidebarCollapsedRail";
import { useUploadedFilesList } from "@/app/components/user-files/useUploadedFilesList";
import { useWalletTopUpReturn } from "@/lib/hooks/useWalletTopUpReturn";

interface Model {
    id: string;
    name: string;
    description: string;
    context_length: number;
    architecture?: { modality?: string, input_modalities?: string[], output_modalities?: string[] };
    pricing?: Record<string, string>;
    [key: string]: any;
}

interface ChatHistorySidebarProps {
    chatHistory: (ChatSession & { id?: string })[];
    setChat: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
    setSelectedModel: (model: Model) => void;
    models: Model[];
    historySearch: string;
    setHistorySearch: (s: string) => void;
    removeChatHistorySession: (id: string) => Promise<boolean>;
    removeChatHistorySessionById?: (id: string) => Promise<boolean>;
    setChatHistory: (sessions: ChatSession[]) => void;
    getChatHistory: () => Promise<ChatSession[]>;
    setTotalSpent: (n: number) => void;
    setError: (s: string) => void;
    currentSessionId: string | null;
    setCurrentSessionId: (sessionId: string | null) => void;
    mobileSidebarOpen?: boolean;
    setMobileSidebarOpen?: (open: boolean) => void;
    isMobile?: boolean;
    setShowSaved: (show: boolean) => void;
    wallet?: number | null;
    onWalletUpdate?: () => Promise<void>;
    onStarToggle: (sessionId: string, isStarred: boolean) => Promise<void>;
    onPublish?: (session: ChatSession, isRepublishing?: boolean, existingUrl?: string) => void;
    onOpenWorkflows?: () => void;
    onOpenNotifications?: () => void;
    // Session management functions
    switchToSession?: (session: ChatSession) => void;
    createNewSessionAndSwitch?: (modelId: string) => void;
    isSessionActive?: (sessionId: string) => boolean;
    isInitialLoading?: boolean;
    onLogout?: () => void;
    /** Initials for collapsed desktop rail avatar (e.g. from logged-in user). */
    userInitials?: string;
}

const ChatHistorySidebar = React.memo<ChatHistorySidebarProps>(({
    chatHistory,
    setChat,
    setSelectedModel,
    models,
    historySearch,
    setHistorySearch,
    removeChatHistorySession,
    removeChatHistorySessionById,
    setChatHistory,
    getChatHistory,
    setTotalSpent,
    setError,
    currentSessionId,
    setCurrentSessionId,
    mobileSidebarOpen = false,
    setMobileSidebarOpen,
    isMobile,
    setShowSaved,
    wallet,
    onWalletUpdate,
    onStarToggle,
    onPublish,
    onOpenWorkflows,
    onOpenNotifications,
    // New session management functions
    switchToSession,
    createNewSessionAndSwitch,
    isSessionActive,
    isInitialLoading = false,
    onLogout,
    userInitials = "?",
}) => {
    const [showWalletModal, setShowWalletModal] = React.useState(false);
    const [paymentModalLoading, setPaymentModalLoading] = React.useState(false);
    useWalletTopUpReturn(setShowWalletModal, 'sidebar');
    const [showIntegrationsModal, setShowIntegrationsModal] = React.useState(false);
    const [showToolPermissionsModal, setShowToolPermissionsModal] = React.useState(false);
    const [showMyFilesModal, setShowMyFilesModal] = React.useState(false);
    const myFilesLibrary = useUploadedFilesList();
    const { refresh: refreshMyFiles, files: myFilesCached } = myFilesLibrary;
    const prevMyFilesOpen = useRef(false);

    useEffect(() => {
        const justOpened = showMyFilesModal && !prevMyFilesOpen.current;
        prevMyFilesOpen.current = showMyFilesModal;
        if (!justOpened) return;
        void refreshMyFiles({ silent: myFilesCached.length > 0 });
    }, [showMyFilesModal, refreshMyFiles, myFilesCached.length]);
    const [showGrantCreditsModal, setShowGrantCreditsModal] = React.useState(false);
    const [isMaster, setIsMaster] = React.useState(false);
    /** Bumped when the collapsed-rail avatar opens the sidebar so the footer “more” menu can open after expand. */
    const [accountMenuSignal, setAccountMenuSignal] = React.useState(0);
    const [showCreateProjectModal, setShowCreateProjectModal] = React.useState(false);
    const {
        projects: codeProjects,
        activeProject,
        selectProject,
        addProject,
    } = useCodeProjects();

    React.useEffect(() => {
        if (!isAigeniusDesktopRuntime()) return;
        const bridge = window.aigeniusDesktop;
        if (!bridge || typeof bridge.setCodeProjectIndex !== "function") return;

        if (activeProject?.rootPath) {
            void bridge.setCodeProjectIndex({
                projectId: activeProject.id,
                rootPath: activeProject.rootPath,
            });
            return;
        }

        void bridge.setCodeProjectIndex(null);
    }, [activeProject?.id, activeProject?.rootPath]);

    // Check if the logged-in user is the master admin — determines visibility of "Give Credits"
    React.useEffect(() => {
        getAdminStatus()
            .then(({ isMaster: master }) => setIsMaster(master))
            .catch(() => setIsMaster(false));
    }, []);

    const handleAddCredits = React.useCallback(() => {
        setShowWalletModal(true);
    }, []);

    const handleOpenAccountFromCollapsedRail = React.useCallback(() => {
        setMobileSidebarOpen?.(true);
        setAccountMenuSignal((s) => s + 1);
    }, [setMobileSidebarOpen]);

    const handleSessionSwitch = React.useCallback((session: ChatSession) => {
        if (switchToSession) {
            switchToSession(session);
        } else {
            setChat(normalizeChatMessages(session.messages || []) as ChatMessage[]);
            setCurrentSessionId(session.id || null);
        }

        if (isMobile && setMobileSidebarOpen) {
            setMobileSidebarOpen(false);
        }
    }, [isMobile, setChat, setCurrentSessionId, setMobileSidebarOpen, switchToSession]);

    const handleNewChat = React.useCallback(() => {
        if (createNewSessionAndSwitch && models.length > 0) {
            createNewSessionAndSwitch(models[0].id);
        } else {
            setChat([]);
            setCurrentSessionId(null);
        }

        setTotalSpent(0);
        setError("");

        if (isMobile && setMobileSidebarOpen) {
            setMobileSidebarOpen(false);
        }
    }, [
        createNewSessionAndSwitch,
        isMobile,
        models,
        setChat,
        setCurrentSessionId,
        setError,
        setMobileSidebarOpen,
        setTotalSpent,
    ]);


    const open = mobileSidebarOpen;

    const modals = (
        <>
            {showIntegrationsModal && (
                <IntegrationsModal onClose={() => setShowIntegrationsModal(false)} />
            )}

            {showToolPermissionsModal && (
                <ToolPermissionsModal onClose={() => setShowToolPermissionsModal(false)} />
            )}

            {showMyFilesModal && (
                <MyFilesModal
                    library={myFilesLibrary}
                    onClose={() => setShowMyFilesModal(false)}
                />
            )}

            {showGrantCreditsModal && (
                <GrantCreditsModal onClose={() => setShowGrantCreditsModal(false)} onWalletUpdate={onWalletUpdate} />
            )}

            <CreateCodeProjectModal
                open={showCreateProjectModal}
                onClose={() => setShowCreateProjectModal(false)}
                onCreate={async (input) => {
                    await addProject(input);
                }}
            />

            <WalletModal
                showWalletModal={showWalletModal}
                setShowWalletModal={setShowWalletModal}
                onWalletUpdate={onWalletUpdate}
                paymentModalLoading={paymentModalLoading}
                setPaymentModalLoading={setPaymentModalLoading}
            />
        </>
    );

    /** Shared motion: slightly longer than default tap feedback so open/close feels fluid, not snappy. */
    const desktopSidebarMotion =
        "duration-[240ms] ease-[cubic-bezier(0.4,0,0.2,1)] motion-reduce:transition-none";
    const mobileDrawerMotion =
        "duration-[240ms] ease-[cubic-bezier(0.4,0,0.2,1)] motion-reduce:transition-none";

    const sharedSidebarBody = (
        <div className="relative flex h-full min-h-0 flex-1 flex-col">
            <SidebarHeader
                isMobile={isMobile || false}
                mobileSidebarOpen={mobileSidebarOpen}
                setMobileSidebarOpen={setMobileSidebarOpen}
                historySearch={historySearch}
                setHistorySearch={setHistorySearch}
                onNewChat={handleNewChat}
            />

            <CodeProjectRail
                projects={codeProjects}
                activeProject={activeProject}
                onSelect={selectProject}
                onCreateClick={() => setShowCreateProjectModal(true)}
            />

            <SidebarContent
                chatHistory={(chatHistory || []).filter(session => session.conversationKind !== 'orphan_question')}
                currentSessionId={currentSessionId}
                models={models || []}
                historySearch={historySearch}
                removeChatHistorySession={removeChatHistorySession}
                removeChatHistorySessionById={removeChatHistorySessionById}
                setChatHistory={setChatHistory}
                getChatHistory={getChatHistory}
                setSelectedModel={setSelectedModel}
                isMobile={isMobile || false}
                setMobileSidebarOpen={setMobileSidebarOpen}
                onStarToggle={onStarToggle}
                onPublish={onPublish}
                handleSessionSwitch={handleSessionSwitch}
                isSessionActive={isSessionActive}
                isInitialLoading={isInitialLoading}
                codeProjects={codeProjects}
            />

            <SidebarFooter
                wallet={wallet}
                onAddCredits={handleAddCredits}
                onShowSavedChats={() => setShowSaved(true)}
                onOpenMyFiles={() => setShowMyFilesModal(true)}
                onOpenWorkflows={onOpenWorkflows}
                onOpenNotifications={onOpenNotifications}
                onIntegrations={() => setShowIntegrationsModal(true)}
                onOpenToolPermissions={() => setShowToolPermissionsModal(true)}
                onGiveCredits={isMaster ? () => setShowGrantCreditsModal(true) : undefined}
                onLogout={onLogout}
                openMenuSignal={accountMenuSignal}
            />
        </div>
    );

    if (!isMobile) {
        return (
            <aside
                data-mobile-sidebar
                className={[
                    "relative z-40 flex h-full min-h-0 shrink-0 flex-col overflow-hidden [contain:layout]",
                    "transition-[width,min-width] will-change-[width,min-width]",
                    desktopSidebarMotion,
                    open ? "w-80 min-w-80" : "w-[52px] min-w-[52px]",
                ].join(" ")}
                style={{
                    backgroundColor: "var(--sidebar-bg)",
                    borderRight: "1px solid var(--sidebar-border)",
                    boxShadow: "0 1px 0 0 rgba(0,0,0,0.15)",
                }}
            >
                <div
                    className="absolute inset-0 z-10 flex h-full w-[52px] flex-col"
                    style={{ backgroundColor: "var(--sidebar-bg)" }}
                >
                    <SidebarCollapsedRail
                        userInitials={userInitials}
                        onExpand={() => setMobileSidebarOpen?.(true)}
                        onNewChat={handleNewChat}
                        onOpenAccountMenu={handleOpenAccountFromCollapsedRail}
                    />
                </div>

                <div
                    className={[
                        "absolute left-0 top-0 z-20 flex h-full min-h-0 w-80 min-w-80 flex-col",
                        "transition-transform will-change-transform",
                        desktopSidebarMotion,
                        open ? "translate-x-0" : "-translate-x-full pointer-events-none",
                    ].join(" ")}
                    style={{ backgroundColor: "var(--sidebar-bg)" }}
                    aria-hidden={!open}
                >
                    {sharedSidebarBody}
                </div>

                {modals}
            </aside>
        );
    }

    return (
        <aside
            data-mobile-sidebar
            className={[
                "fixed inset-y-0 left-0 flex h-full w-screen max-w-[100vw] flex-col overflow-hidden",
                "transform transition-transform will-change-transform [backface-visibility:hidden]",
                mobileDrawerMotion,
                open
                    ? "z-50 translate-x-0"
                    : "z-40 -translate-x-full pointer-events-none",
            ].join(" ")}
            style={{
                backgroundColor: "var(--sidebar-bg)",
                borderRight: "1px solid var(--sidebar-border)",
                boxShadow: "0 1px 0 0 rgba(0,0,0,0.15)",
            }}
            aria-hidden={!open}
        >
            {sharedSidebarBody}

            {modals}
        </aside>
    );
});

ChatHistorySidebar.displayName = "ChatHistorySidebar";

export default ChatHistorySidebar;
