import { AudioStatus } from '@/app/components/model-interface/features/chat/hooks/audioMode.utils';

export interface Model {
    id: string;
    name: string;
    subtitle?: string;
    description: string;
    context_length: number;
    architecture?: { modality?: string, input_modalities?: string[], output_modalities?: string[] };
    pricing?: Record<string, string>;
    [key: string]: any;
}

export interface UploadedFileInfo {
    file?: File;
    fileUrl: string;
    isImage: boolean;
    displayName: string;
    mimeType?: string;
    source?: 'local' | 'library';
    libraryFileId?: string;
}

/** Return `false` to keep the composer text (e.g. wallet modal without sending). Omitted/`true` clears after send is accepted. */
export type SendMessageResult = boolean | void;

export interface ChatBoxInputProps {
    onSendMessage: (
        message: string,
        model: Model,
    ) => SendMessageResult | Promise<SendMessageResult>;
    onFileUpload?: (file: File) => void;
    onCancelUpload?: () => void;
    models: Model[];
    selectedModel: Model;
    onModelChange: (model: Model) => void;
    onModelNameClick?: () => void;
    placeholder?: string;
    /** While true, user can still type; send is blocked and the send control becomes Stop. */
    responseInProgress?: boolean;
    onStopGeneration?: () => void;
    className?: string;
    uploading?: boolean;
    uploadProgress?: number | null;
    supportsFileUpload?: boolean;
    /** When set, paperclip opens this menu instead of the native file picker directly. */
    onAttachmentMenuRequest?: () => void;
    uploadedFiles?: UploadedFileInfo[];
    onRemoveUploadedFile?: (index: number) => void;
    inputValue?: string;
    onInputChange?: (value: string) => void;
    sidebarStyle?: boolean; // new prop for Sidebar-matching style
    streaming?: boolean;
    onStreamingToggle?: (enabled: boolean) => void;
    // Personalities
    selectedPersonalityName?: string;
    onPersonalityClick?: () => void;
    selectedPersonalityIconUrl?: string;
    onClearPersonality?: () => void;
    // UI adaptation for embedded/modal use
    compact?: boolean;
    hideModelSelector?: boolean;
    hideUpload?: boolean;
    mini?: boolean;
    // Audio
    onAudioModeToggle?: (enabled: boolean) => void;
    isAudioMode?: boolean;
    onStartSTT?: () => void;
    onCancelSTT?: () => void;
    onConfirmSTT?: () => void;
    isSTTActive?: boolean;
    /** Dictation pipeline only — not conversational status. */
    isDictationTranscribing?: boolean;
    audioStatus?: AudioStatus;
    audioTranscription?: string;
    audioNotice?: string;
}

export interface UploadProgressBarProps {
    uploading: boolean;
    uploadProgress: number | null;
    fileName?: string;
    fileType?: string;
    onCancel?: () => void;
}

export interface ChatTextareaProps {
    value: string;
    onChange: (value: string) => void;
    onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
    placeholder: string;
    /** When false, textarea is editable (send may still be blocked separately). */
    textareaDisabled?: boolean;
    uploading: boolean;
    responseInProgress?: boolean;
    onStopGeneration?: () => void;
    textareaRef?: React.RefObject<HTMLTextAreaElement>;
    sidebarStyle?: boolean; // new prop for Sidebar-matching style
    mini?: boolean;
    // Audio
    onAudioModeToggle?: (enabled: boolean) => void;
    isAudioMode?: boolean;
    onStartSTT?: () => void;
    isSTTActive?: boolean;
}

export interface ActionButtonsProps {
    disabled: boolean;
    uploading: boolean;
    supportsFileUpload: boolean;
    onAttachmentClick: () => void;
    streaming?: boolean;
    onStreamingToggle?: (enabled: boolean) => void;
    // Audio
    onAudioModeToggle?: (enabled: boolean) => void;
    isAudioMode?: boolean;
    onStartSTT?: () => void;
    onCancelSTT?: () => void;
    onConfirmSTT?: () => void;
    isSTTActive?: boolean;
    /** Dictation pipeline only — not conversational status. */
    isDictationTranscribing?: boolean;
}

export interface ModelSelectorProps {
    models: Model[];
    selectedModel: Model;
    onModelChange: (model: Model) => void;
    onModelNameClick?: () => void;
    disabled: boolean;
    uploading: boolean;
    isDropdownOpen: boolean;
    setIsDropdownOpen: (open: boolean) => void;
}

export interface SubmitButtonProps {
    inputValue: string;
    disabled: boolean;
    uploading: boolean;
    onSubmit: (e: React.FormEvent) => void;
}

export interface ChatControlsProps {
    disabled: boolean;
    uploading: boolean;
    supportsFileUpload: boolean;
    selectedModel: Model;
    onModelNameClick?: () => void;
    onAttachmentClick: () => void;
    sidebarStyle?: boolean; // new prop for Sidebar-matching style
    streaming?: boolean;
    onStreamingToggle?: (enabled: boolean) => void;
    glisten?: boolean; // new prop for glisten effect
    // Personalities
    selectedPersonalityName?: string;
    onPersonalityClick?: () => void;
    selectedPersonalityIconUrl?: string;
    onClearPersonality?: () => void;
    // UI adaptation for embedded/modal use
    compact?: boolean;
    hideModelSelector?: boolean;
    hideUpload?: boolean;
    mini?: boolean;
    // Audio
    onAudioModeToggle?: (enabled: boolean) => void;
    isAudioMode?: boolean;
    onStartSTT?: () => void;
    onCancelSTT?: () => void;
    onConfirmSTT?: () => void;
    isSTTActive?: boolean;
    isDictationTranscribing?: boolean;
}
