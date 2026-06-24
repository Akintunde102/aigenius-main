import { Model, ChatMessage } from '@/app/components/model-interface/shared/types';

// Grouped props for better organization and reduced prop drilling
export interface ChatData {
    chat: ChatMessage[];
    selectedModel: Model | null;
    models: Model[];
    showCosts: boolean;
    showNaira: boolean;
    showTyping: boolean;
    loading: boolean;
    streaming?: boolean;
    streamingEnabled?: boolean;
}

export interface UIState {
    imagePreview: string | null;
    showScrollToBottom: boolean;
    mobileSidebarOpen?: boolean;
    sidebarStyle?: boolean;
}

export interface FileUploadState {
    uploading: boolean;
    uploadProgress: number | null;
    supportsImageUpload: boolean;
}

export interface InputState {
    input: string;
}

export interface ChatHandlers {
    onDeleteMessage: (idx: number) => void;
    onSaveMessage: (msg: ChatMessage) => void;
    onReplayMessage: (content: string, idx: number) => void;
    onSendMessage: (message: string, model: any) => void;
    onFileUpload: (file: File) => void;
    onModelNameClick: () => void;
    onCancelUpload?: () => void;
    onShowSavedChats?: () => void;
    onStreamingToggle?: (enabled: boolean) => void;
    setImagePreview: (preview: string | null) => void;
    setInput: (input: string) => void;
    setIsTyping?: (typing: boolean) => void;
}

export interface ChatRefs {
    chatEndRef: React.RefObject<HTMLDivElement>;
    chatAreaRef: React.RefObject<HTMLDivElement>;
}

// Main ChatContainer props interface using grouped props
export interface ChatContainerProps {
    chatData: ChatData;
    uiState: UIState;
    fileUploadState: FileUploadState;
    inputState: InputState;
    handlers: ChatHandlers;
    refs: ChatRefs;
}

// Legacy props interface for backward compatibility during transition
export interface LegacyChatContainerProps {
    chat: ChatMessage[];
    selectedModel: Model | null;
    models: Model[];
    showCosts: boolean;
    showNaira: boolean;
    showTyping: boolean;
    loading: boolean;
    imagePreview: string | null;
    setImagePreview: (preview: string | null) => void;
    chatEndRef: React.RefObject<HTMLDivElement>;
    chatAreaRef: React.RefObject<HTMLDivElement>;
    showScrollToBottom: boolean;
    onDeleteMessage: (idx: number) => void;
    onSaveMessage: (msg: ChatMessage) => void;
    onReplayMessage: (content: string, idx: number) => void;
    onSendMessage: (message: string, model: any) => void;
    onFileUpload: (file: File) => void;
    uploading: boolean;
    uploadProgress: number | null;
    supportsImageUpload: boolean;
    input: string;
    setInput: (input: string) => void;
    onModelNameClick: () => void;
    onCancelUpload?: () => void;
    setIsTyping?: (typing: boolean) => void;
    streaming?: boolean;
    streamingEnabled?: boolean;
    onStreamingToggle?: (enabled: boolean) => void;
    mobileSidebarOpen?: boolean;
    onShowSavedChats?: () => void;
    sidebarStyle?: boolean;
}
