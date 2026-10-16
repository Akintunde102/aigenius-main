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
    imagePreview: any | string | null;
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
    onCancelUpload?: (file?: File) => void;
    onShowSavedChats?: () => void;
    onStreamingToggle?: (enabled: boolean) => void;
    setImagePreview: (preview: any) => void;
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

