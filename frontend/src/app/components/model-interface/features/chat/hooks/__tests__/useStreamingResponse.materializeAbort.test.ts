import { migrateAbortControllerKey } from '../abortControllerMap.utils';
import { createClientDraftSessionId } from '@/app/components/model-interface/conversation/clientDraftSession';

describe('streaming draft abort map migration', () => {
  it('moves abort controller from client draft key to server conversation id', () => {
    const map = new Map<string, AbortController>();
    const clientDraftKey = createClientDraftSessionId();
    const serverId = '00000000-0000-4000-8000-000000000001';
    const controller = new AbortController();
    map.set(clientDraftKey, controller);

    migrateAbortControllerKey(map, clientDraftKey, serverId);

    expect(map.has(clientDraftKey)).toBe(false);
    expect(map.get(serverId)).toBe(controller);
    expect(controller.signal.aborted).toBe(false);
  });

  it('does not abort when a second draft uses a different client key', () => {
    const map = new Map<string, AbortController>();
    const firstDraft = createClientDraftSessionId();
    const secondDraft = createClientDraftSessionId();
    const firstController = new AbortController();
    map.set(firstDraft, firstController);

    const existing = map.get(secondDraft);
    if (existing) {
      existing.abort();
    }
    map.set(secondDraft, new AbortController());

    expect(firstController.signal.aborted).toBe(false);
    expect(map.get(firstDraft)).toBe(firstController);
  });
});
