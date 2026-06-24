/**
 * Live Ollama Cloud checks against a real local Ollama daemon (signed in for cloud).
 *
 * Enable:
 *   RUN_OLLAMA_CLOUD_LIVE=1
 *   ollama serve && ollama signin
 *
 * Optional (single model, faster):
 *   RUN_OLLAMA_CLOUD_LIVE_MODEL=ollama:glm-5.1:cloud
 *
 * Run (desktop-server):
 *   cross-env RUN_OLLAMA_CLOUD_LIVE=1 npm test -- --testPathPattern=ollama-cloud.live
 */

import { OllamaRelayClient } from './ollama-relay.client.js';
import { OLLAMA_RELAY_EVENTS } from './ollama-relay.events.js';
import {
  buildOllamaCloudLiveCases,
  chatOllamaRegistryModel,
  probeOllamaRunning,
} from './ollama-cloud.harness.js';

const shouldRun = process.env.RUN_OLLAMA_CLOUD_LIVE === '1';
const filterCatalogId = (process.env.RUN_OLLAMA_CLOUD_LIVE_MODEL || '').trim();

(shouldRun ? describe : describe.skip)('Ollama Cloud — live (local Ollama)', () => {
  let ollamaReachable = false;

  beforeAll(async () => {
    ollamaReachable = await probeOllamaRunning();
    if (!ollamaReachable) {
      console.warn(
        '[ollama-cloud.live] Ollama is not reachable. Start with `ollama serve` and run `ollama signin` for cloud models.',
      );
    }
  });

  const cases = buildOllamaCloudLiveCases().filter(
    (testCase) => !filterCatalogId || testCase.catalogId === filterCatalogId,
  );

  it.each(cases)(
    '$catalogId chats via registry model $registryModel',
    async (testCase) => {
      if (!ollamaReachable) {
        return;
      }

      const { content, done } = await chatOllamaRegistryModel({
        registryModel: testCase.registryModel,
        prompt: 'Ping',
        stream: false,
      });

      expect(content.length).toBeGreaterThan(0);
      expect(done).toBe(true);
    },
    180_000,
  );

  it(
    'relays a streaming cloud inference request through the sidecar handler',
    async () => {
      if (!ollamaReachable) {
        return;
      }

      const primary = cases[0];
      if (!primary) {
        throw new Error('No Ollama Cloud cases configured');
      }

      const socket = {
        connected: true,
        emit: jest.fn(),
        on: jest.fn(),
        once: jest.fn(),
        off: jest.fn(),
        disconnect: jest.fn(),
      };

      const client = OllamaRelayClient.getInstance();
      (client as unknown as { socket: typeof socket }).socket = socket;

      await (client as unknown as {
        handleInferenceRequest: (requestId: string, payload: unknown) => Promise<void>;
      }).handleInferenceRequest('live-req-1', {
        model: primary.wireModel,
        messages: [{ role: 'user', content: 'Reply with one short word.' }],
        stream: true,
      });

      const chunkCalls = socket.emit.mock.calls.filter(
        ([event]) => event === OLLAMA_RELAY_EVENTS.inferenceChunk,
      );
      expect(chunkCalls.length).toBeGreaterThan(0);

      const chunks = chunkCalls.map(([, payload]) => (payload as { text?: string }).text || '').join('');
      expect(chunks.trim().length).toBeGreaterThan(0);
      expect(socket.emit).toHaveBeenCalledWith(OLLAMA_RELAY_EVENTS.inferenceDone, { requestId: 'live-req-1' });
    },
    180_000,
  );
});
