/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Config } from '../types';
import { STREAM_DONE_SIGNAL, NEWLINE, ERROR_MESSAGES } from './access-model.constants.js';
import { extractSseDataPayload } from './access-model.sse.js';
import type { StreamingResult, ToolStreamEvent } from './access-model.types.js';
import {
  fulfillDesktopToolDelegate,
  fulfillToolApprovalRequest,
  postDesktopToolDelegateResult,
  postToolApprovalResult,
} from './access-model.delegate.js';

export function processStreamingContent(delta: any): string | Array<{
  type: string;
  text?: string;
  image_url?: { url: string };
}> | null {
  const content = delta.content || '';
  const images = delta.images || [];

  if (images.length > 0) {
    const contentBlocks: Array<{
      type: string;
      text?: string;
      image_url?: { url: string };
    }> = [];

    images.forEach((image: any) => {
      if (image.type === 'image_url' && image.image_url?.url) {
        contentBlocks.push({ type: 'image_url', image_url: { url: image.image_url.url } });
      } else if (image.type === 'image' && image.data) {
        contentBlocks.push({ type: 'image_url', image_url: { url: `data:image/png;base64,${image.data}` } });
      } else if (image.data && typeof image.data === 'string' && image.data.length > 1000) {
        const dataUrl = image.data.startsWith('data:image/') ? image.data : `data:image/png;base64,${image.data}`;
        contentBlocks.push({ type: 'image_url', image_url: { url: dataUrl } });
      }
    });

    return contentBlocks;
  }

  // Some gateways send a single content part object `{ type, text }` instead of a string or array.
  if (content && typeof content === 'object' && !Array.isArray(content)) {
    const typed = content as { type?: string };
    if (typed.type) {
      return [content as { type: string; text?: string; image_url?: { url: string } }];
    }
  }

  // Simple text content (string) or array of blocks
  return content;
}

/**
 * Updates streaming result with metadata from chunk
 */
export function updateStreamingResult(result: StreamingResult, chunk: any): void {
  if (chunk.usage) {
    result.usage = chunk.usage;
  }
  if (chunk.cost) {
    result.cost = chunk.cost;
  }
  if (chunk.wallet !== undefined) {
    result.wallet = chunk.wallet;
  }
  if (chunk.tool_usage_charges?.length) {
    result.tool_usage_charges = chunk.tool_usage_charges;
  }
}

/**
 * Processes a single streaming data chunk
 */
export async function processStreamingChunk(
  data: string,
  onData: (content: string | Array<{
    type: string;
    text?: string;
    image_url?: { url: string };
  }>, reasoning?: string, reasoningDetails?: any[]) => void,
  finalResult: StreamingResult,
  config: Config,
  onToolStreamEvent?: (event: ToolStreamEvent) => void,
  signal?: AbortSignal,
): Promise<boolean> {
  const trimmed = data.trim();
  if (trimmed === STREAM_DONE_SIGNAL) {
    return true; // Signal completion
  }

  if (trimmed === '') {
    return false;
  }

  try {
    const chunk = JSON.parse(trimmed) as Record<string, unknown>;

    const errObj = chunk.error as { message?: string } | undefined;
    if (errObj && typeof errObj.message === 'string' && errObj.message.trim()) {
      console.error('[access-model] Streaming error chunk detected:', chunk);
      throw new Error(errObj.message.trim());
    }

    const choice0 = (chunk.choices as Array<{ finish_reason?: string | null; delta?: { content?: string } }> | undefined)?.[0];
    if (choice0?.finish_reason === 'error') {
      const fromDelta = typeof choice0.delta?.content === 'string' ? choice0.delta.content.trim() : '';
      throw new Error(
        fromDelta || 'The model ended with an error. Try again or switch provider.',
      );
    }

    const delta = choice0?.delta as Record<string, unknown> | undefined;

    if (delta) {
      const toolStreamEvent = delta.tool_stream_event as ToolStreamEvent | undefined;
      if (toolStreamEvent && onToolStreamEvent) {
        onToolStreamEvent(toolStreamEvent);
      }

      if (toolStreamEvent?.type === 'client_delegate') {
        await fulfillDesktopToolDelegate(toolStreamEvent, config, signal, onToolStreamEvent);
      }

      if (toolStreamEvent?.type === 'approval_request') {
        await fulfillToolApprovalRequest(toolStreamEvent, config, signal);
      }

      const contentToSend = processStreamingContent(delta);
      const reasoning = typeof delta.reasoning === 'string' ? delta.reasoning : undefined;
      const reasoningDetails = delta.reasoning_details as unknown[] | undefined;

      const hasStreamContent =
        typeof contentToSend === 'string'
          ? contentToSend.length > 0
          : Array.isArray(contentToSend) && contentToSend.length > 0;

      // Preserve whitespace-only text chunks. Markdown structure often arrives as
      // newline-only deltas, and trimming them here collapses live formatting.
      if (typeof contentToSend === 'string' && contentToSend.length > 0) {
        onData(contentToSend, reasoning, reasoningDetails);
      } else if (Array.isArray(contentToSend) && contentToSend.length > 0) {
        onData(contentToSend, reasoning, reasoningDetails);
      } else if (reasoning) {
        // Send reasoning even without content (for thinking display)
        onData('', reasoning, reasoningDetails);
      }
    }

    // Update result with metadata
    updateStreamingResult(finalResult, chunk);
  } catch (error) {
    if (error instanceof SyntaxError) {
      return false;
    }
    throw error;
  }

  return false;
}

/**
 * Reads and processes streaming data from the response body
 */
export async function processStreamingData(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  decoder: TextDecoder,
  onData: (content: string | Array<{
    type: string;
    text?: string;
    image_url?: { url: string };
  }>, reasoning?: string, reasoningDetails?: any[]) => void,
  finalResult: StreamingResult,
  config: Config,
  signal?: AbortSignal,
  onToolStreamEvent?: (event: ToolStreamEvent) => void,
): Promise<void> {
  let buffer = '';

  while (true) {
    // Check if aborted
    if (signal?.aborted) {
      throw new Error(ERROR_MESSAGES.REQUEST_ABORTED);
    }

    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    let lineEnd;

    while ((lineEnd = buffer.indexOf(NEWLINE)) !== -1) {
      const line = buffer.slice(0, lineEnd).trim();
      buffer = buffer.slice(lineEnd + 1);

      if (!line || line.startsWith(':')) {
        continue;
      }

      const dataPayload = extractSseDataPayload(line);
      if (dataPayload === undefined) {
        continue;
      }

      const isDone = await processStreamingChunk(
        dataPayload,
        onData,
        finalResult,
        config,
        onToolStreamEvent,
        signal,
      );

      if (isDone) {
        return; // Stream completed
      }
    }
  }
}
