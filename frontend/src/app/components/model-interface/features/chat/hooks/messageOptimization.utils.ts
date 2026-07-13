import { ChatMessage } from '@/app/components/model-interface/shared/types';
import { OpenRouterContentBlock, OpenRouterMessage } from '@/nobox-client/functions/access-model';
import { MessageOptimizationResult } from './chatOperations.types';
import { CHAT_CONFIG, CONTENT_TYPES } from './chatOperations.constants';

/**
 * Processes text content blocks and calculates their size
 */
function processTextBlock(
    block: OpenRouterContentBlock,
    contentSize: number
): { block: OpenRouterContentBlock; size: number } {
    if (block.type === CONTENT_TYPES.TEXT && block.text) {
        return {
            block: block as OpenRouterContentBlock,
            size: contentSize + block.text.length
        };
    }
    return { block: block as OpenRouterContentBlock, size: contentSize };
}

/**
 * Processes image content blocks with size limits
 */
function processImageBlock(
    block: OpenRouterContentBlock,
    isRecent: boolean,
    totalSize: number,
    imagesRemoved: number
): { block: OpenRouterContentBlock | null; size: number; imagesRemoved: number } {
    if (block.type === CONTENT_TYPES.IMAGE_URL && block.image_url?.url) {
        const imageSize = block.image_url.url.length;

        if (isRecent && totalSize + imageSize < CHAT_CONFIG.MAX_TOTAL_SIZE && imageSize < CHAT_CONFIG.MAX_IMAGE_SIZE) {
            return {
                block: block as OpenRouterContentBlock,
                size: imageSize,
                imagesRemoved
            };
        } else {
            // Replace large or old images with a placeholder
            return {
                block: {
                    type: CONTENT_TYPES.TEXT,
                    text: CONTENT_TYPES.IMAGE_PLACEHOLDER
                } as OpenRouterContentBlock,
                size: CONTENT_TYPES.IMAGE_PLACEHOLDER.length,
                imagesRemoved: imagesRemoved + 1
            };
        }
    }
    return { block: block as OpenRouterContentBlock, size: 0, imagesRemoved };
}

/**
 * Processes structured content (arrays of content blocks)
 */
function processStructuredContent(
    content: OpenRouterContentBlock[],
    isRecent: boolean,
    totalSize: number
): { blocks: OpenRouterContentBlock[]; size: number; imagesRemoved: number } {
    const optimizedBlocks: OpenRouterContentBlock[] = [];
    let contentSize = 0;
    let imagesRemoved = 0;

    content.forEach(block => {
        if (block.type === CONTENT_TYPES.TEXT) {
            const result = processTextBlock(block, contentSize);
            optimizedBlocks.push(result.block);
            contentSize = result.size;
        } else if (block.type === 'file_url') {
            const fileUrlBlock = block as OpenRouterContentBlock & {
                file_url?: { url?: string; name?: string };
            };
            const name = fileUrlBlock.file_url?.name?.trim() || 'File';
            const url = fileUrlBlock.file_url?.url?.trim() || '';
            const textBlock = {
                type: CONTENT_TYPES.TEXT,
                text: url ? `${name}: ${url}` : name,
            } as OpenRouterContentBlock;
            const result = processTextBlock(textBlock, contentSize);
            optimizedBlocks.push(result.block);
            contentSize = result.size;
        } else if (block.type === CONTENT_TYPES.IMAGE_URL) {
            const result = processImageBlock(block, isRecent, totalSize + contentSize, imagesRemoved);
            if (result.block) {
                optimizedBlocks.push(result.block);
            }
            contentSize += result.size;
            imagesRemoved = result.imagesRemoved;
        }
    });

    return { blocks: optimizedBlocks, size: contentSize, imagesRemoved };
}

/**
 * Processes string content
 */
function processStringContent(content: string): { content: string; size: number } {
    return {
        content,
        size: content.length
    };
}

/**
 * Processes a single message and returns optimized content
 */
function processMessage(
    msg: ChatMessage,
    isRecent: boolean,
    totalSize: number
): { optimizedContent: string | OpenRouterContentBlock[]; messageSize: number; imagesRemoved: number } {
    let optimizedContent: string | OpenRouterContentBlock[];
    let messageSize = 0;
    let imagesRemoved = 0;

    if (typeof msg.content === 'string') {
        // Simple text message — optional apiContent overrides for model requests only
        const textForApi = msg.apiContent ?? msg.content;
        const result = processStringContent(textForApi);
        optimizedContent = result.content;
        messageSize = result.size;
    } else if (Array.isArray(msg.content)) {
        // Structured content with potential images
        const result = processStructuredContent(msg.content as OpenRouterContentBlock[], isRecent, totalSize);
        optimizedContent = result.blocks.length > 0 ? result.blocks : CONTENT_TYPES.CONTENT_REMOVED;
        messageSize = result.size;
        imagesRemoved = result.imagesRemoved;
    } else {
        // Fallback
        optimizedContent = String(msg.content || '');
        messageSize = optimizedContent.length;
    }

    return { optimizedContent, messageSize, imagesRemoved };
}

/**
 * Handles message truncation for non-recent messages that exceed size limits
 */
function handleMessageTruncation(
    optimizedContent: string | OpenRouterContentBlock[],
    messageSize: number,
    isRecent: boolean,
    totalSize: number,
    messagesTruncated: number
): { content: string | OpenRouterContentBlock[]; size: number; truncated: number } {
    if (!isRecent && totalSize + messageSize > CHAT_CONFIG.MAX_TOTAL_SIZE) {
        const truncated = messagesTruncated + 1;
        const truncatedContent = typeof optimizedContent === 'string'
            ? CONTENT_TYPES.MESSAGE_TRUNCATED(messageSize)
            : [{ type: CONTENT_TYPES.TEXT, text: CONTENT_TYPES.CONTENT_TRUNCATED }];
        const truncatedSize = typeof truncatedContent === 'string'
            ? truncatedContent.length
            : truncatedContent.reduce((size, block) => size + (block.text?.length || 0), 0);

        return { content: truncatedContent, size: truncatedSize, truncated };
    }

    return { content: optimizedContent, size: messageSize, truncated: messagesTruncated };
}

/**
 * Creates optimization message for user feedback
 */
function createOptimizationMessage(imagesRemoved: number, messagesTruncated: number): string | null {
    if (imagesRemoved === 0 && messagesTruncated === 0) {
        return null;
    }

    const parts = [];
    if (imagesRemoved > 0) {
        parts.push(`${imagesRemoved} old/large image(s) replaced with placeholders`);
    }
    if (messagesTruncated > 0) {
        parts.push(`${messagesTruncated} message(s) truncated due to size`);
    }

    return `Optimized request: ${parts.join(', ')}`;
}

/**
 * Utility function to optimize messages for API requests
 * Handles large base64 images and long conversations
 */
export function optimizeMessagesForAPI(messages: ChatMessage[]): MessageOptimizationResult {
    let totalSize = 0;
    let imagesRemoved = 0;
    let messagesTruncated = 0;

    const optimizedMessages: OpenRouterMessage[] = [];

    // Process messages in reverse order (most recent first)
    const reversedMessages = [...messages].reverse();

    for (let i = 0; i < reversedMessages.length; i++) {
        const msg = reversedMessages[i];
        const isRecent = i < CHAT_CONFIG.KEEP_RECENT_MESSAGES;

        // Process the message content
        const { optimizedContent, messageSize, imagesRemoved: msgImagesRemoved } = processMessage(
            msg,
            isRecent,
            totalSize
        );

        imagesRemoved += msgImagesRemoved;

        // Handle truncation for non-recent messages
        const { content, size, truncated } = handleMessageTruncation(
            optimizedContent,
            messageSize,
            isRecent,
            totalSize,
            messagesTruncated
        );

        messagesTruncated = truncated;

        // Add to total size and create optimized message
        totalSize += size;

        optimizedMessages.unshift({
            role: msg.role,
            content,
            ...(msg.messageId && { messageId: msg.messageId }),
            ...(msg.timestamp !== undefined && { timestamp: msg.timestamp }),
            ...(msg.modelId && { modelId: msg.modelId }),
            ...(msg.modelName && { modelName: msg.modelName }),
            ...(msg.usage && { usage: msg.usage }),
            ...(msg.cost !== undefined && { cost: msg.cost }),
            ...(msg.tool_usage_charges?.length && { tool_usage_charges: msg.tool_usage_charges }),
            ...(msg.events ? { events: msg.events } : {}),  
        });
    }

    // Log optimization results and create user message
    const optimizationMessage = createOptimizationMessage(imagesRemoved, messagesTruncated);

    if (optimizationMessage) {
        console.log(`Message optimization: ${optimizationMessage}, total size: ${(totalSize / 1024 / 1024).toFixed(2)}MB`);
    }

    return { messages: optimizedMessages, message: optimizationMessage };
}
