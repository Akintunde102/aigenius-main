import {
  catalogIdToWireModel,
  getOllamaRegistryModelName,
  OLLAMA_CLOUD_CATALOG_IDS,
  OLLAMA_LOCAL_BASE_URL,
} from './ollama-cloud.js';

export { OLLAMA_CLOUD_CATALOG_IDS, catalogIdToWireModel, getOllamaRegistryModelName };

export type OllamaCloudLiveCase = {
  catalogId: string;
  wireModel: string;
  registryModel: string;
};

export function buildOllamaCloudLiveCases(): OllamaCloudLiveCase[] {
  return OLLAMA_CLOUD_CATALOG_IDS.map((catalogId) => {
    const wireModel = catalogIdToWireModel(catalogId);
    return {
      catalogId,
      wireModel,
      registryModel: getOllamaRegistryModelName(wireModel),
    };
  });
}

export async function probeOllamaRunning(timeoutMs = 4_000): Promise<boolean> {
  try {
    const res = await fetch(`${OLLAMA_LOCAL_BASE_URL}/api/tags`, {
      signal: AbortSignal.timeout(timeoutMs),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function chatOllamaRegistryModel(args: {
  registryModel: string;
  prompt: string;
  stream?: boolean;
  timeoutMs?: number;
}): Promise<{ content: string; done: boolean }> {
  const { registryModel, prompt, stream = false, timeoutMs = 120_000 } = args;
  const res = await fetch(`${OLLAMA_LOCAL_BASE_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: registryModel,
      messages: [
        { role: 'system', content: 'Reply with exactly: OK' },
        { role: 'user', content: prompt },
      ],
      stream,
    }),
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => res.statusText);
    throw new Error(`Ollama chat failed (${res.status}): ${detail.trim() || res.statusText}`);
  }

  if (!stream) {
    const data = (await res.json()) as { message?: { content?: string }; done?: boolean };
    return {
      content: data.message?.content?.trim() ?? '',
      done: data.done === true,
    };
  }

  if (!res.body) {
    throw new Error('Ollama chat returned no response body');
  }

  let content = '';
  let done = false;
  const reader = res.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';

  while (true) {
    const { value, done: readDone } = await reader.read();
    if (readDone) {
      break;
    }
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    for (const line of lines) {
      if (!line.trim()) {
        continue;
      }
      const parsed = JSON.parse(line) as { message?: { content?: string }; done?: boolean };
      if (parsed.message?.content) {
        content += parsed.message.content;
      }
      if (parsed.done) {
        done = true;
      }
    }
  }

  if (buffer.trim()) {
    const parsed = JSON.parse(buffer) as { message?: { content?: string }; done?: boolean };
    if (parsed.message?.content) {
      content += parsed.message.content;
    }
    if (parsed.done) {
      done = true;
    }
  }

  return { content: content.trim(), done };
}
