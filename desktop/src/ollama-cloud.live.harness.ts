/**
 * Live-test helpers for Ollama Cloud (Jest only — excluded from Electron compile).
 */

import { OLLAMA_LOCAL_BASE_URL } from './ollama-cloud.js';

export { buildOllamaCloudLiveCases, type OllamaCloudLiveCase } from './ollama-cloud.js';

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
