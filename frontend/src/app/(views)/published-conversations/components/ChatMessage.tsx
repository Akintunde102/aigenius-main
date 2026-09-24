import React, { useState, useMemo, useCallback } from 'react';
import { FiCopy, FiCheck } from 'react-icons/fi';
import { JsonSyntaxBlock } from '@/app/components/JsonSyntaxBlock';
import {
    ChatMessage as ChatMessageType,
    MessageEvent,
    Model,
} from '@/app/components/model-interface/shared/types';
import { clusterToolDisplayBlocks } from '@/app/components/model-interface/features/chat/components/cluster-tool-display-blocks';
import { buildAssistantRenderSegments } from '@/app/components/model-interface/features/chat/components/assistant-turn-summary.utils';
import { buildChatMessageDisplayBlocks } from '@/app/components/model-interface/features/messages/components/chatMessageDisplay.utils';
import { enrichEventsWithLegacyThinking } from '@/app/components/model-interface/features/chat/utils/thinkingEvent.utils';
import { buildCopyTextFromEvents } from '@/lib/utils/messageCopyText';
import { textPartToPlainString } from '@/lib/utils/messageTextUtils';
import { normalizeMessageContent } from '@/lib/utils/messageContentUtils';
import { AssistantTurnSegments } from '@/app/components/model-interface/features/messages/components/AssistantTurnSegments';
import { StructuredMessage } from '@/app/components/model-interface/features/message-types/components/ImageMessage';
import type { StructuredContentBlock } from '@/app/components/model-interface/features/message-types/components/messageAttachment.utils';
import { shouldHideEmptyAssistantMessage } from '@/app/components/model-interface/features/messages/utils/assistantMessageVisibility.utils';

import { useMessageContent, useCostCalculation } from '@/app/(views)/published-conversations/hooks';
import {
    ImageMessage,
    ImageWithTextMessage,
    AudioMessage,
    FileMessage,
    TextMessage,
    CostDisplay,
} from './';

interface ChatMessageProps {
    msg: ChatMessageType;
    idx: number;
    selectedModel: Model | null;
    models?: Model[];
    showCosts: boolean;
    onSave: (msg: ChatMessageType) => void;
    onCopy: (content: string) => void;
    onReplay: (message: ChatMessageType, idx: number) => void;
    onImagePreview: (url: string) => void;
    imagePreview: string | null;
    setImagePreview: (url: string | null) => void;
    formatCost: (cost: number, showNaira: boolean) => string;
    savedChats?: ChatMessageType[];
    loading?: boolean;
    streaming?: boolean;
}

export function ChatMessage({
    msg,
    models = [],
    showCosts,
    onCopy,
    onImagePreview,
    imagePreview,
    setImagePreview,
    formatCost,
    streaming = false,
}: ChatMessageProps) {
    const [copied, setCopied] = useState(false);
    const messageContent = useMessageContent(msg.content);
    const cost = useCostCalculation(msg, showCosts);

    const modelName = useMemo(() => {
        if (msg.modelName) return msg.modelName;
        if (msg.modelId) {
            const matched = models.find((m) => m.id === msg.modelId);
            return matched?.name ?? msg.modelId;
        }
        return msg.role === 'assistant' ? 'Assistant' : '';
    }, [msg.modelName, msg.modelId, msg.role, models]);

    const displayName = useMemo(() => {
        if (msg.role === 'assistant' && msg.personaName) return msg.personaName;
        return modelName;
    }, [msg.personaName, modelName, msg.role]);

    const displayEvents = useMemo(() => {
        if (!msg.events?.length) {
            return enrichEventsWithLegacyThinking([], msg);
        }
        const filtered = msg.events.filter(
            (e): e is MessageEvent => e != null && typeof e === 'object' && 'type' in e,
        );
        return enrichEventsWithLegacyThinking(filtered, msg);
    }, [msg]);

    const displayBlocks = useMemo(
        () => buildChatMessageDisplayBlocks(displayEvents, { streaming }),
        [displayEvents, streaming],
    );
    const renderBlocks = useMemo(() => clusterToolDisplayBlocks(displayBlocks), [displayBlocks]);
    const renderSegments = useMemo(
        () => buildAssistantRenderSegments(renderBlocks, streaming),
        [renderBlocks, streaming],
    );

    const normalizedContent = useMemo(
        () => normalizeMessageContent(msg.content),
        [msg.content],
    );
    const structuredContent = Array.isArray(normalizedContent)
        ? (normalizedContent as StructuredContentBlock[])
        : null;

    const speaker = msg.role === 'user' ? 'You' : (displayName || 'Assistant');

    const handleCopy = useCallback(() => {
        if (displayEvents.length > 0) {
            onCopy(buildCopyTextFromEvents(displayEvents));
        } else if (structuredContent) {
            const text = structuredContent
                .map((block) => textPartToPlainString(block.text))
                .filter((part) => part.trim())
                .join('\n\n');
            onCopy(text || textPartToPlainString(structuredContent));
        } else if (messageContent.isImageMsg) {
            onCopy(messageContent.imageText
                ? `${messageContent.imageText}\n\nImage: ${messageContent.imageUrl}`
                : messageContent.imageUrl);
        } else if (messageContent.isFileMsg) {
            onCopy(messageContent.fileUrl);
        } else {
            onCopy(typeof msg.content === 'string' ? msg.content : textPartToPlainString(normalizedContent));
        }
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1600);
    }, [displayEvents, structuredContent, messageContent, msg.content, normalizedContent, onCopy]);

    const isLongUserText = useMemo(() => {
        if (msg.role !== 'user') return false;
        const plain = textPartToPlainString(normalizedContent);
        return plain.length > 280;
    }, [msg.role, normalizedContent]);

    const messageContainerClasses = useMemo(() => {
        if (msg.role === 'user') {
            return [
                'relative ml-auto min-w-0 rounded-[22px] border px-4 py-3 leading-relaxed',
                '[background-color:var(--user-bubble-bg)] [border-color:var(--user-bubble-border)] [color:var(--user-bubble-fg)]',
            ].join(' ');
        }
        return 'relative min-w-0 w-full px-1 py-1 leading-relaxed [color:var(--app-ink-900)]';
    }, [msg.role]);

    const messageStyles = useMemo(() => ({
        width: '100%',
        position: 'relative' as const,
        display: 'flex',
        flexDirection: 'column' as const,
        fontSize: 'var(--chat-body-size, 0.9375rem)',
        ...(msg.role === 'user'
            ? { maxWidth: isLongUserText ? '352px' : '320px' }
            : { maxWidth: '100%' }),
    }), [msg.role, isLongUserText]);

    if (shouldHideEmptyAssistantMessage(msg, { streaming, displayEvents })) {
        return null;
    }

    return (
        <div
            className={`relative flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start md:justify-center'}`}
            aria-label={speaker}
        >
            <div className={`relative flex w-full items-end gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start md:max-w-[720px]'}`}>
                <div className={`${messageContainerClasses} min-w-0`} style={messageStyles}>
                    <div className="min-w-0">
                        {msg.role === 'assistant' && renderSegments.length > 0 ? (
                            <AssistantTurnSegments
                                segments={renderSegments}
                                messageRole={msg.role}
                                streaming={streaming}
                                gapClassName="flex flex-col gap-3"
                            />
                        ) : messageContent.isAudioMsg ? (
                            <AudioMessage fileUrl={messageContent.fileUrl} onCopy={onCopy} />
                        ) : messageContent.isFileMsg ? (
                            <FileMessage
                                fileUrl={messageContent.fileUrl}
                                fileName={messageContent.fileName}
                                onCopy={onCopy}
                            />
                        ) : structuredContent ? (
                            <StructuredMessage
                                content={structuredContent}
                                onImagePreview={onImagePreview}
                                imagePreview={imagePreview}
                                setImagePreview={setImagePreview}
                                streaming={streaming}
                            />
                        ) : messageContent.isImageMsg ? (
                            messageContent.imageText ? (
                                <ImageWithTextMessage
                                    imageUrl={messageContent.imageUrl}
                                    imageText={messageContent.imageText}
                                    onImagePreview={onImagePreview}
                                    imagePreview={imagePreview}
                                    setImagePreview={setImagePreview}
                                />
                            ) : (
                                <ImageMessage
                                    imageUrl={messageContent.imageUrl}
                                    onImagePreview={onImagePreview}
                                    imagePreview={imagePreview}
                                    setImagePreview={setImagePreview}
                                />
                            )
                        ) : typeof normalizedContent === 'string' && normalizedContent.trim() ? (
                            <TextMessage
                                content={normalizedContent}
                                streaming={streaming}
                                role={msg.role}
                            />
                        ) : normalizedContent != null && normalizedContent !== '' ? (
                            <JsonSyntaxBlock
                                value={normalizedContent}
                                preClassName="max-h-64 border-slate-200/80"
                                codeClassName="text-[11px]"
                            />
                        ) : null}
                    </div>

                    <div className={`mt-2 flex items-center gap-2 text-[11px] text-[var(--chat-muted-fg)] ${msg.role === 'user' ? 'justify-end' : 'justify-between'}`}>
                        <button
                            type="button"
                            onClick={handleCopy}
                            aria-label={copied ? 'Message copied' : `Copy ${speaker} message`}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-[var(--chat-muted-fg)] hover:bg-[var(--surface-muted)] hover:text-[var(--app-ink-900)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--chat-accent)]"
                        >
                            {copied ? <FiCheck size={13} aria-hidden /> : <FiCopy size={13} aria-hidden />}
                        </button>
                        <CostDisplay
                            msg={msg}
                            streaming={streaming}
                            showCosts={showCosts}
                            cost={cost}
                            formatCost={formatCost}
                            assistantFooterLabel={msg.role === 'assistant' ? displayName : undefined}
                        />
                    </div>
                    <span className="sr-only" aria-live="polite">{copied ? 'Copied to clipboard' : ''}</span>
                </div>
            </div>
        </div>
    );
}
