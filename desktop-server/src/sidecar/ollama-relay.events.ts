/** Socket.io event names for the Ollama desktop relay (fixed names for NestJS @SubscribeMessage). */

export const OLLAMA_RELAY_EVENTS = {
  inferenceRequest: 'inference:request',
  inferenceChunk: 'inference:chunk',
  inferenceDone: 'inference:done',
  inferenceError: 'inference:error',
  inferenceResponse: 'inference:response',
  inferenceCancel: 'inference:cancel',
  modelsSync: 'models:sync',
} as const;

export type OllamaInferenceChunkPayload = {
  requestId: string;
  text?: string;
  content?: string;
};

export type OllamaInferenceDonePayload = {
  requestId: string;
};

export type OllamaInferenceErrorPayload = {
  requestId: string;
  error: string;
};

export type OllamaInferenceResponsePayload = {
  requestId: string;
  content?: string;
  error?: string;
};

export function extractTextFromOllamaStreamLine(parsed: Record<string, unknown>): string {
  if (typeof parsed.error === 'string' && parsed.error.trim()) {
    throw new Error(parsed.error.trim());
  }
  const message = parsed.message;
  if (message && typeof message === 'object') {
    const content = (message as Record<string, unknown>).content;
    if (typeof content === 'string') {
      return content;
    }
  }
  if (typeof parsed.response === 'string') {
    return parsed.response;
  }
  return '';
}
