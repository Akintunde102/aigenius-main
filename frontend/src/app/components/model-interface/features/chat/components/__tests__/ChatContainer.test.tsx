import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ChatContainer from '../ChatContainer';
import { useBrowserDetection } from '@/app/components/model-interface/shared/hooks';
import { useMobileKeyboard, useMobileLayout } from '@/app/components/model-interface/features/mobile/hooks';
import { useAnchoredOrphanNotes } from '../../hooks/useAnchoredOrphanNotes';

// Mock sub-components
jest.mock('../ChatArea', () => ({
    ChatArea: () => <div data-testid="chat-area" />
}));

// Mock ChatBoxInput with imperative handle
jest.mock('@/app/components/ChatBoxInput', () => {
    const React = require('react');
    return {
        ChatBoxInput: React.forwardRef((props: any, ref: any) => {
            React.useImperativeHandle(ref, () => ({
                focusInput: jest.fn(),
                queueFiles: jest.fn()
            }));
            return (
                <div data-testid="chat-box-input">
                    <button onClick={() => props.onSendMessage('test message', null)}>Send</button>
                </div>
            );
        })
    };
});

// Mock hooks
jest.mock('@/app/components/model-interface/shared/hooks', () => ({
    useBrowserDetection: jest.fn(() => ({ isMobile: false, browserInfo: {} }))
}));

jest.mock('@/app/components/model-interface/features/mobile/hooks', () => ({
    useMobileKeyboard: jest.fn(() => ({ keyboardHeight: 0, isKeyboardOpen: false })),
    useMobileLayout: jest.fn(() => ({
        containerStyle: { background: 'red' },
        chatAreaStyle: { padding: '10px' },
        inputContainerStyle: { bottom: '0' },
        spacerStyle: {},
        isFullScreenMobile: false
    }))
}));

jest.mock('../../hooks/useAnchoredOrphanNotes', () => ({
    useAnchoredOrphanNotes: jest.fn(() => ({
        markersByMessageId: {},
        hiddenMessageIds: {},
        activeMarker: null,
        activeModalPosition: null,
        activeInput: '',
        setActiveInput: jest.fn(),
        isSending: false,
        openMarker: jest.fn(),
        closeActiveMarker: jest.fn(),
        toggleMessageVisibility: jest.fn(),
        createOrphanNoteFromTrigger: jest.fn(),
        deleteMarker: jest.fn(),
        sendActiveMarkerMessage: jest.fn(),
    })),
}));

const mockProps: any = {
    chat: [],
    selectedModel: { id: 'test-model', name: 'Test Model' },
    models: [{ id: 'test-model', name: 'Test Model' }],
    showCosts: true,
    showNaira: false,
    showTyping: false,
    loading: false,
    imagePreview: null,
    setImagePreview: jest.fn(),
    chatEndRef: { current: null },
    chatAreaRef: { current: null },
    showScrollToBottom: false,
    onDeleteMessage: jest.fn(),
    onSaveMessage: jest.fn(),
    onReplayMessage: jest.fn(),
    currentSessionId: 'session-1',
    onSendMessage: jest.fn(),
    onFileUpload: jest.fn(),
    uploading: false,
    uploadProgress: null,
    supportsImageUpload: true,
    uploadedFiles: [],
    onModelNameClick: jest.fn(),
};

describe('ChatContainer', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (useAnchoredOrphanNotes as jest.Mock).mockReturnValue({
            markersByMessageId: {},
            hiddenMessageIds: {},
            activeMarker: null,
            activeModalPosition: null,
            activeInput: '',
            setActiveInput: jest.fn(),
            isSending: false,
            openMarker: jest.fn(),
            closeActiveMarker: jest.fn(),
            toggleMessageVisibility: jest.fn(),
            createOrphanNoteFromTrigger: jest.fn(),
            deleteMarker: jest.fn(),
            sendActiveMarkerMessage: jest.fn(),
        });
    });

    it('renders with correct layout styles from hooks', () => {
        const { container } = render(<ChatContainer {...mockProps} />);
        const chatContainer = container.firstChild as HTMLElement;
        
        expect(chatContainer.style.background).toBe('red');
        expect(screen.getByTestId('chat-area')).toBeDefined();
        expect(screen.getByTestId('chat-box-input')).toBeDefined();
    });

    it('handles message sending through ChatBoxInput', () => {
        const onSendMessage = jest.fn();
        render(<ChatContainer {...mockProps} onSendMessage={onSendMessage} />);
        
        fireEvent.click(screen.getByText('Send'));
        expect(onSendMessage).toHaveBeenCalledWith('test message', null);
    });

    it('exposes imperative focus and file queuing methods', () => {
        const ref = React.createRef<any>();
        render(<ChatContainer {...mockProps} ref={ref} />);
        
        expect(ref.current).toHaveProperty('focusInput');
        expect(ref.current).toHaveProperty('queueFiles');
        
        // We can't easily check if it calls the internal ref method without more complex mocking,
        // but verify it doesn't throw.
        expect(() => ref.current.focusInput()).not.toThrow();
        expect(() => ref.current.queueFiles([])).not.toThrow();
    });

    it('adapts layout for mobile based on hooks', () => {
        (useBrowserDetection as jest.Mock).mockReturnValue({ isMobile: true, browserInfo: { isIOS: true } });
        (useMobileKeyboard as jest.Mock).mockReturnValue({ keyboardHeight: 300, isKeyboardOpen: true });
        
        const { container } = render(<ChatContainer {...mockProps} mobileSidebarOpen={false} />);
        
        // Verify hook was called with correct mobile state
        expect(useMobileKeyboard).toHaveBeenCalledWith(expect.objectContaining({ isMobile: true }));
    });
});
