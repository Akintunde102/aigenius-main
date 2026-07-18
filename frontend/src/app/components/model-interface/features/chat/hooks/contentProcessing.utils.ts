import { ChatMessage, ToolUsageCharge } from '@/app/components/model-interface/shared/types';
import { ContentBlock, ProcessedContent } from './chatOperations.types';
import { CONTENT_TYPES } from './chatOperations.constants';
import { textPartToPlainString } from '@/lib/utils/messageTextUtils';

/**
 * Converts structured content to display text
 */
export function contentToDisplayText(content: ProcessedContent): string {
    if (typeof content === 'string') {
        return content;
    }

    return content.map((block) =>
        block.type === CONTENT_TYPES.TEXT
            ? textPartToPlainString(block.text)
            : CONTENT_TYPES.IMAGE_PLACEHOLDER
    ).join('');
}

/**
 * Processes structured content from backend API response
 */
export function processBackendContent(content: any): ProcessedContent {
    if (Array.isArray(content)) {
        // Backend returned structured content - preserve it
        return content.map((block: any) => ({
            type: block.type,
            text: block.text,
            image_url: block.image_url,
            file_url: block.file_url,
            imageText: block.imageText,
            input_audio: block.input_audio
        }));
    } else {
        // Backend returned simple string content
        return content;
    }
}

/**
 * Merges new content blocks into existing accumulated content
 */
export function mergeContentBlocks(
    accumulatedContent: ProcessedContent,
    newContent: ProcessedContent | ContentBlock
): ProcessedContent {
    if (typeof newContent === 'string') {
        return handleStringMerge(accumulatedContent, newContent);
    }

    if (newContent && typeof newContent === 'object' && !Array.isArray(newContent)) {
        return handleStructuredMerge(accumulatedContent, [newContent as ContentBlock]);
    }

    return handleStructuredMerge(accumulatedContent, newContent as ContentBlock[]);
}

/**
 * Handles merging string content into accumulated content
 */
function handleStringMerge(
    accumulatedContent: ProcessedContent,
    newContent: string
): ProcessedContent {
    if (typeof accumulatedContent === 'string') {
        return accumulatedContent + newContent;
    }

    // Convert accumulated structured content to string and append
    const textContent = contentToDisplayText(accumulatedContent);
    return textContent + newContent;
}

/**
 * Handles merging structured content blocks
 */
function handleStructuredMerge(
    accumulatedContent: ProcessedContent,
    newContent: ContentBlock[]
): ProcessedContent {
    const mergedContent: ContentBlock[] = typeof accumulatedContent === 'string'
        ? (accumulatedContent
            ? [{ type: CONTENT_TYPES.TEXT, text: accumulatedContent } as ContentBlock]
            : [])
        : [...accumulatedContent];

    for (const block of newContent) {
        if (block.type === CONTENT_TYPES.TEXT) {
            mergeTextBlock(mergedContent, block);
        } else {
            mergedContent.push(block);
        }
    }

    return mergedContent;
}

/**
 * Merges a text block into existing content
 */
function mergeTextBlock(mergedContent: ContentBlock[], newBlock: ContentBlock): void {
    const existingTextBlock = mergedContent.find(block => block.type === CONTENT_TYPES.TEXT);
    const nextPiece = textPartToPlainString(newBlock.text);
    if (existingTextBlock) {
        existingTextBlock.text = textPartToPlainString(existingTextBlock.text) + nextPiece;
    } else {
        mergedContent.push({ ...newBlock, text: nextPiece });
    }
}

/**
 * Generates a unique message ID
 */
export function generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Creates a chat message with processed content
 */
export function createChatMessage(
    role: 'user' | 'assistant',
    content: ProcessedContent,
    modelId: string,
    modelName: string,
    sessionId?: string | null,
    usage?: any,
    cost?: any,
    personaName?: string,
    personaIconUrl?: string,
    tool_executions?: any[],
    tool_usage_charges?: ToolUsageCharge[],
    messageIdOverride?: string,
    timestampOverride?: number
): ChatMessage {
    const messageId = messageIdOverride || generateMessageId();
    return {
        id: messageId,
        messageId,
        role,
        content,
        timestamp: timestampOverride || Date.now(),
        modelId,
        modelName,
        sessionId: sessionId || undefined,
        ...(usage && { usage }),
        ...(cost !== undefined && { cost }),
        ...(personaName && { personaName }),
        ...(personaIconUrl && { personaIconUrl }),
        ...(tool_executions && tool_executions.length > 0 && { tool_executions }),
        ...(tool_usage_charges && tool_usage_charges.length > 0 && { tool_usage_charges }),
    } as ChatMessage;
}

/**
 * Updates the last assistant message in chat with new content
 */
export function updateLastAssistantMessage(
    chat: ChatMessage[],
    newContent: ProcessedContent
): ChatMessage[] {
    const updated = [...chat];
    if (updated.length > 0 && updated[updated.length - 1].role === 'assistant') {
        updated[updated.length - 1] = {
            ...updated[updated.length - 1],
            content: newContent,
        };
    }
    return updated;
}

/**
 * Updates the last assistant message with usage and cost information
 */
export function updateLastMessageWithMetrics(
    chat: ChatMessage[],
    usage?: any,
    cost?: any,
    tool_usage_charges?: ToolUsageCharge[],
): ChatMessage[] {
    const updated = [...chat];
    if (updated.length > 0 && updated[updated.length - 1].role === 'assistant') {
        const lastMessage = updated[updated.length - 1];
        const hasIncoming =
            usage !== undefined ||
            cost !== undefined ||
            (tool_usage_charges !== undefined && tool_usage_charges.length > 0);
        if (!hasIncoming) {
            return updated;
        }
        // Single completion callback: attach metrics once when not already set.
        if (
            lastMessage.usage === undefined
            && lastMessage.cost === undefined
            && !(lastMessage.tool_usage_charges?.length)
        ) {
            updated[updated.length - 1] = {
                ...lastMessage,
                usage: usage || undefined,
                ...(cost !== undefined ? { cost } : {}),
                ...(tool_usage_charges !== undefined && tool_usage_charges.length > 0 ? { tool_usage_charges } : {}),
            };
        }
    }
    return updated;
}
