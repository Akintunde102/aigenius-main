/* eslint-disable @typescript-eslint/no-explicit-any */
/** SSE `data` lines: `data:` then optional space (OpenAI/OpenRouter). */
export function extractSseDataPayload(trimmedLine: string): string | undefined {
  if (!trimmedLine.startsWith('data:')) {
    return undefined;
  }
  return trimmedLine.slice('data:'.length).trimStart();
}
