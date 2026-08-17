import type { WebContents } from 'electron';
import { StringDecoder } from 'string_decoder';
import { loopbackHttpOrigin } from './loopback-host';
import { MINI_SERVER_PORT } from './mini-server-port';
import { shellChunkChannel } from './local-tool-executor-shell';
import {
  formatOllamaCloudError,
  getOllamaRegistryModelName,
  isOllamaCloudModel,
  OLLAMA_LOCAL_BASE_URL,
} from './ollama-cloud';

const SERVER_URL = loopbackHttpOrigin(MINI_SERVER_PORT);

export async function checkLocalOllamaStatus(): Promise<{ ok: true; result: string; rawData?: any } | { ok: false; error: string }> {
  try {
    const res = await fetch(`${OLLAMA_LOCAL_BASE_URL}/api/tags`);
    if (!res.ok) {
      return { ok: false, error: `Ollama returned ${res.status}` };
    }
    const data = await res.json();
    return { ok: true, result: 'Ollama is running', rawData: data };
  } catch (e) {
    return { ok: false, error: 'Ollama is not running or not reachable' };
  }
}

export async function ensureOllamaCloudModelAvailable(model: string): Promise<void> {
  if (!isOllamaCloudModel(model)) {
    return;
  }

  const registryModel = getOllamaRegistryModelName(model);
  const res = await fetch(`${OLLAMA_LOCAL_BASE_URL}/api/pull`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: registryModel, stream: false }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    const detail = body.trim() || res.statusText;
    throw new Error(`Could not prepare Ollama Cloud model "${registryModel}". Run "ollama signin" and try again. ${detail}`);
  }
}

export async function readOllamaError(res: Response): Promise<string> {
  const body = typeof res.text === 'function' ? await res.text().catch(() => '') : '';
  return body.trim() || res.statusText;
}

export async function runLocalOllamaChat(
  sender: WebContents,
  args: Record<string, unknown>,
  streamId?: string,
): Promise<{ ok: true; result: string; rawData?: any } | { ok: false; error: string }> {
  const channel = streamId && streamId.length > 0 ? shellChunkChannel(streamId) : undefined;

  const sendChunk = (text: string): void => {
    if (!channel || text.length === 0) return;
    try {
      if (!sender.isDestroyed()) {
        sender.send(channel, { stream: 'stdout', text });
      }
    } catch {
      // sender may be gone
    }
  };

  try {
    const payload = args.payload as Record<string, unknown> | undefined;
    const model = typeof payload?.model === 'string' ? payload.model : '';
    await ensureOllamaCloudModelAvailable(model);

    const resolvedModel = isOllamaCloudModel(model) ? getOllamaRegistryModelName(model) : model;
    const chatPayload = {
      ...payload,
      model: resolvedModel,
    };

    const res = await fetch(`${OLLAMA_LOCAL_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(chatPayload),
    });

    if (!res.ok) {
      const detail = await readOllamaError(res);
      return {
        ok: false,
        error: `Ollama API error: ${isOllamaCloudModel(model) ? formatOllamaCloudError(detail) : detail}`,
      };
    }
    if (!res.body) {
      return { ok: false, error: 'No response body from Ollama' };
    }

    let fullResponse = '';
    const reader = res.body.getReader();
    const decoder = new StringDecoder('utf8');
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (value) {
        buffer += decoder.write(Buffer.from(value));
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const parsed = JSON.parse(line);
            if (parsed.message?.content) {
              fullResponse += parsed.message.content;
            }
            sendChunk(line + '\n');
          } catch {
            // invalid json chunk, ignore
          }
        }
      }
      if (done) break;
    }

    if (buffer.trim()) {
      try {
        const parsed = JSON.parse(buffer);
        if (parsed.message?.content) {
          fullResponse += parsed.message.content;
        }
        sendChunk(buffer + '\n');
      } catch {
        // ignore
      }
    }

    return { ok: true, result: fullResponse };
  } catch (e: any) {
    return { ok: false, error: e.message || 'Failed to chat with Ollama' };
  }
}
