/**
 * Live desktop executor checks for Ollama Cloud (real local Ollama).
 *
 * Enable: RUN_OLLAMA_CLOUD_LIVE=1 with `ollama serve` and `ollama signin`.
 * Optional: RUN_OLLAMA_CLOUD_LIVE_MODEL=ollama:glm-5.1:cloud
 */

import { runLocalDesktopTool } from './local-tool-executor.js';
import {
  buildOllamaCloudLiveCases,
  probeOllamaRunning,
  type OllamaCloudLiveCase,
} from './ollama-cloud.live.harness.js';

const shouldRun = process.env.RUN_OLLAMA_CLOUD_LIVE === '1';
const filterCatalogId = (process.env.RUN_OLLAMA_CLOUD_LIVE_MODEL || '').trim();

const mockSender = {
  isDestroyed: () => false,
  send: jest.fn(),
};

(shouldRun ? describe : describe.skip)('local_ollama_chat — Ollama Cloud live', () => {
  let ollamaReachable = false;

  beforeAll(async () => {
    ollamaReachable = await probeOllamaRunning();
  });

  const cases: OllamaCloudLiveCase[] = buildOllamaCloudLiveCases().filter(
    (testCase: OllamaCloudLiveCase) => !filterCatalogId || testCase.catalogId === filterCatalogId,
  );

  it.each(cases)(
    '$catalogId returns assistant text via local_ollama_chat',
    async (testCase: OllamaCloudLiveCase) => {
      if (!ollamaReachable) {
        return;
      }

      const out = await runLocalDesktopTool(
        mockSender as any,
        'local_ollama_chat',
        {
          payload: {
            model: testCase.wireModel,
            messages: [
              { role: 'system', content: 'Reply with exactly: OK' },
              { role: 'user', content: 'Ping' },
            ],
            stream: true,
          },
        },
      );

      expect(out.ok).toBe(true);
      if (!out.ok) {
        return;
      }
      expect(out.result.trim().length).toBeGreaterThan(0);
    },
    180_000,
  );
});
