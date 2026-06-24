import React from 'react';
import { act, render, screen } from '@testing-library/react';
import ModelInterface from '../ModelInterface';
import { useModelInterface } from '../core/hooks';
import { useMobileSidebar } from '@/app/components/MobileSidebarContext';
import { useRouter } from 'next/navigation';

jest.mock('../core/hooks', () => ({
    useModelInterface: jest.fn()
}));
jest.mock('@/app/components/MobileSidebarContext', () => ({
    useMobileSidebar: jest.fn(() => ({ mainSidebarVisible: true }))
}));
jest.mock('next/navigation', () => ({
    useRouter: jest.fn(() => ({ push: jest.fn(), replace: jest.fn() }))
}));
jest.mock('next/dynamic', () => ({
    __esModule: true,
    default: (fn: any) => {
        const React = require('react');
        return (props: any) => {
            const [Comp, setComp] = React.useState(null);
            React.useEffect(() => {
                fn().then((mod: any) => setComp(() => mod.default || mod));
            }, []);
            return Comp ? <Comp {...props} /> : null;
        };
    }
}));
jest.mock('@/lib/utils/modelChatConversationUtils', () => ({
    removeChatHistorySession: jest.fn(),
    removeChatHistorySessionById: jest.fn(),
    getChatHistory: jest.fn(),
    toggleChatSessionStarred: jest.fn(),
}));
jest.mock('@/lib/calls/model-chat-conversation', () => ({
    publishConversation: jest.fn(),
    setConversationPersonality: jest.fn(),
    listPersonalities: jest.fn().mockResolvedValue([]),
}));
jest.mock('@/app/components/model-interface/features/chat/hooks', () => ({
    DRAFT_SESSION_KEY: '__draft__',
    CHAT_CONFIG: { MIN_WALLET_BALANCE: 10, MODEL_BALANCE_FACTOR: 1.5 },
    useWalletManagement: jest.fn(() => ({
        refreshWalletBalance: jest.fn(),
        handlePaymentSuccess: jest.fn(),
        paymentModalLoading: false,
        setPaymentModalLoading: jest.fn(),
    })),
}));
jest.mock('@/lib/hooks/useTokenHandler', () => jest.fn());
jest.mock('@/lib/hooks/useWalletTopUpReturn', () => ({
    useWalletTopUpReturn: jest.fn(),
}));
jest.mock('@/lib/calls/get-logged-user-details', () => ({
    getUserDetails: jest.fn().mockResolvedValue(null),
}));
jest.mock('../shared/hooks', () => ({
    useBrowserDetection: jest.fn(() => ({ isMobile: false })),
    useKeyboardShortcuts: jest.fn(() => ({ handleGlobalKeyDown: jest.fn() }))
}));
jest.mock('@/app/components/model-interface/features/file-upload/hooks', () => ({
    useFileUpload: jest.fn(() => ({})),
}));
jest.mock('@/lib/utils/desktop-runtime', () => ({
    useIsDesktopShell: jest.fn(() => false),
}));

const mockChatHistorySidebar = jest.fn((props: any) => <div data-testid="sidebar" />);
jest.mock('../../ChatHistorySidebar', () => ({
    __esModule: true,
    default: (props: any) => mockChatHistorySidebar(props)
}));

jest.mock('../../modals/AddToWallet', () => ({
    __esModule: true,
    default: () => <div data-testid="add-to-wallet" />
}));

jest.mock('../features/modals', () => ({
    PublishConversationModal: () => <div data-testid="publish-modal" />,
    PersonalityModal: () => <div data-testid="personality-modal" />,
}));

jest.mock('../features', () => ({
    DragDropHandler: ({ children }: any) => <div data-testid="drag-drop">{children}</div>,
    MobileToggleButton: () => <div data-testid="mobile-toggle" />,
    ChatContainer: React.forwardRef((props: any, ref: any) => <div data-testid="chat-container" />),
    ModalContainer: () => <div data-testid="modal-container" />,
    MessageHandlers: ({ children }: any) => <div data-testid="message-handlers">{children({
        handleDeleteMessage: jest.fn(),
        handleDeleteMessageById: jest.fn(),
        handleReplayMessage: jest.fn(),
    })}</div>,
    MobileSidebarHandler: ({ children }: any) => <div data-testid="mobile-sidebar-handler">{children({
        mobileSidebarOpen: false,
        setMobileSidebarOpen: jest.fn()
    })}</div>,
}));

jest.mock('lucide-react', () => ({
    AlertCircle: () => <div data-testid="alert-icon" />,
    X: () => <div data-testid="close-icon" />,
    Plus: () => <span />,
    Trash2: () => <span />,
    Maximize2: () => <span />,
    Minimize2: () => <span />,
    Copy: () => <span />,
    Check: () => <span />,
    ChevronLeft: () => <span />,
    ChevronRight: () => <span />,
    Menu: () => <span />,
    Send: () => <span />,
}));

function buildMockModelInterface(overrides: {
    personalities?: Array<{ id: string; name: string }>;
} = {}) {
    const setCurrentSessionId = jest.fn();
    const setChatForSession = jest.fn();
    const setTotalSpent = jest.fn();
    const setError = jest.fn();
    const createNewSessionAndSwitch = jest.fn();

    return {
        modelState: {
            models: [],
            modelsLoading: false,
            selectedModel: { id: 'm1', name: 'Model 1' },
            setSelectedModel: jest.fn(),
            recentModels: [],
            modalSortedModels: [],
            supportsImageUpload: true,
            selectedModelForDetails: null,
            setSelectedModelForDetails: jest.fn(),
            handleShowModelDetails: jest.fn(),
            isModelPinned: jest.fn(),
            togglePinModel: jest.fn(),
        },
        personalityState: {
            personalities: overrides.personalities ?? [],
            setPersonalities: jest.fn(),
            selectedPersonalityName: '',
            setSelectedPersonalityName: jest.fn(),
            selectedPersonalityIconUrl: '',
            setSelectedPersonalityIconUrl: jest.fn(),
        },
        chatState: {
            input: '',
            setInput: jest.fn(),
            chat: [],
            setChat: jest.fn(),
            pendingOrphanReply: null,
            clearPendingOrphanReply: jest.fn(),
            setChatForSession,
            assistantResponse: '',
            chatHistory: [{
                id: 'session-1',
                title: 'Existing Conversation',
                modelId: 'm1',
                messages: [{ id: 'assistant-1', role: 'assistant', content: 'Existing response', timestamp: 1, modelId: 'm1' }],
            }],
            setChatHistory: jest.fn(),
            savedChats: [],
            setSavedChats: jest.fn(),
            savedFullChats: [],
            setSavedFullChats: jest.fn(),
            currentSessionId: 'session-1',
            viewSessionId: 'session-1',
            setCurrentSessionId,
            refreshChatHistory: jest.fn(),
            populateFromBackend: jest.fn(),
            showTyping: false,
            setShowTyping: jest.fn(),
            showScrollToBottom: false,
            setShowScrollToBottom: jest.fn(),
        },
        uiState: {
            loading: false,
            setLoading: jest.fn(),
            error: '',
            setError,
            streaming: false,
            setStreaming: jest.fn(),
            streamingEnabled: true,
            setStreamingEnabled: jest.fn(),
            imagePreview: null,
            setImagePreview: jest.fn(),
            uploading: false,
            setUploading: jest.fn(),
            uploadProgress: null,
            setUploadProgress: jest.fn(),
            dragActive: false,
            setDragActive: jest.fn(),
            showCosts: true,
            showNaira: false,
            showSaved: false,
            setShowSaved: jest.fn(),
            totalSpent: 0,
            setTotalSpent,
            optimizationMessage: '',
        },
        modalState: {
            showModelDetailsModal: false,
            setShowModelDetailsModal: jest.fn(),
            showModelSelectionModal: false,
            setShowModelSelectionModal: jest.fn(),
        },
        filterState: {
            search: '',
            setSearch: jest.fn(),
            historySearch: '',
            setHistorySearch: jest.fn(),
            orderByCost: 'none' as const,
            setOrderByCost: jest.fn(),
            allModalities: [],
            selectedModalities: [],
            allOutputModalities: [],
            selectedOutputModalities: [],
            showWebSearch: false,
            setShowWebSearch: jest.fn(),
            showToolsOnly: false,
            setShowToolsOnly: jest.fn(),
            pinnedModelIds: [],
            favoritesLoaded: true,
            orderBy: 'name',
            setOrderBy: jest.fn(),
            orderDir: 'asc' as const,
            setOrderDir: jest.fn(),
            selectedProviders: [],
            setSelectedProviders: jest.fn(),
            imageFilterOnly: false,
            setImageFilterOnly: jest.fn(),
            toggleModality: jest.fn(),
            toggleOutputModality: jest.fn(),
        },
        walletState: {
            wallet: 100,
            setWallet: jest.fn(),
            refreshWalletFromBackend: jest.fn(),
        },
        refs: {
            chatEndRef: { current: null },
            chatAreaRef: { current: null },
            fileInputRef: { current: null },
        },
        computed: {
            currentChatCostUSD: 0,
            currentChatCostNaira: 0,
        },
        sessionState: {
            switchToSession: jest.fn(),
            createNewSessionAndSwitch,
            isSessionActive: jest.fn((id: string) => id === 'session-1'),
            startOrphanReply: jest.fn(),
            project: 'projectt',
        },
        audioState: {
            isAudioMode: false,
            audioTranscription: '',
            audioStatus: 'idle',
            audioNotice: null,
            audioVolume: 0,
            handleAudioModeToggle: jest.fn(),
            isMiniMode: false,
            handleMiniModeToggle: jest.fn(),
            isSTTActive: false,
            handleStartSTT: jest.fn(),
            isDictationTranscribing: false,
            analyzer: null,
        },
        actions: {
            handleSend: jest.fn(),
            handleStop: jest.fn(),
            handleInputKeyDown: jest.fn(),
            handleSave: jest.fn(),
            handleInsertSaved: jest.fn(),
            handleRemoveSaved: jest.fn(),
        },
        __spies: {
            setCurrentSessionId,
            setChatForSession,
            setTotalSpent,
            setError,
            createNewSessionAndSwitch,
        },
    };
}

describe('ModelInterface', () => {
    let mockValues: ReturnType<typeof buildMockModelInterface>;

    beforeEach(() => {
        jest.clearAllMocks();
        window.history.replaceState({}, '', '/chat/session-1');
        mockValues = buildMockModelInterface();
        (useModelInterface as jest.Mock).mockReturnValue(mockValues);
    });

    it('renders the base layout structure', async () => {
        render(<ModelInterface />);
        expect(await screen.findByTestId('sidebar')).toBeDefined();
        expect(await screen.findByTestId('chat-container')).toBeDefined();
        expect(await screen.findByTestId('message-handlers')).toBeDefined();
        expect(await screen.findByTestId('drag-drop')).toBeDefined();
    });

    it('shows the personality modal status if configured', async () => {
        mockValues = buildMockModelInterface({
            personalities: [{ id: 'pers1', name: 'Friendly Assistant' }],
        });
        (useModelInterface as jest.Mock).mockReturnValue(mockValues);

        render(<ModelInterface />);
        expect(await screen.findByTestId('chat-container')).toBeDefined();
    });

    it('Create New Chat clears the active session instead of reopening the previous conversation', async () => {
        render(<ModelInterface routeConversationId="session-1" />);
        await screen.findByTestId('sidebar');

        const sidebarCall = mockChatHistorySidebar.mock.calls[mockChatHistorySidebar.mock.calls.length - 1];
        const sidebarProps = sidebarCall?.[0];
        expect(sidebarProps).toBeDefined();

        await act(async () => {
            await sidebarProps!.createNewSessionAndSwitch('m1');
        });

        expect(mockValues.__spies.setCurrentSessionId).toHaveBeenCalledWith(null);
        expect(mockValues.__spies.setChatForSession).toHaveBeenCalledWith('__draft__', []);
        expect(mockValues.__spies.setTotalSpent).toHaveBeenCalledWith(0);
        expect(mockValues.__spies.setError).toHaveBeenCalledWith('');
        expect(mockValues.__spies.createNewSessionAndSwitch).not.toHaveBeenCalled();
    });
});
