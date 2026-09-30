import {
  CLIENT_DRAFT_SESSION_PREFIX,
  clearClientDraftStorageKeys,
  createClientDraftSessionId,
  getClientDraftSessionId,
  isClientDraftSessionId,
  migrateLegacyDraftStorageKey,
  renewClientDraftSessionId,
  resolveActiveChatMapKey,
} from '../clientDraftSession';
import { DRAFT_SESSION_KEY } from '../../features/chat/hooks/chatOperations.constants';

describe('clientDraftSession', () => {
  it('creates prefixed ids that are not server conversation uuids', () => {
    const id = createClientDraftSessionId();
    expect(id.startsWith(CLIENT_DRAFT_SESSION_PREFIX)).toBe(true);
    expect(isClientDraftSessionId(id)).toBe(true);
    expect(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)).toBe(false);
  });

  it('renewClientDraftSessionId returns a new active id', () => {
    const before = getClientDraftSessionId();
    const renewed = renewClientDraftSessionId();
    expect(renewed).not.toBe(before);
    expect(getClientDraftSessionId()).toBe(renewed);
  });

  it('resolveActiveChatMapKey uses client draft when view session is null', () => {
    const draft = getClientDraftSessionId();
    expect(resolveActiveChatMapKey(null)).toBe(draft);
    expect(resolveActiveChatMapKey('conv-real')).toBe('conv-real');
  });

  it('migrateLegacyDraftStorageKey moves __draft__ onto the active client draft id', () => {
    renewClientDraftSessionId();
    const active = getClientDraftSessionId();
    const next = migrateLegacyDraftStorageKey(
      { [DRAFT_SESSION_KEY]: 'composer text', other: 'x' },
      (v) => !v.trim(),
    );
    expect(next[active]).toBe('composer text');
    expect(next[DRAFT_SESSION_KEY]).toBeUndefined();
    expect(next.other).toBe('x');
  });

  it('clearClientDraftStorageKeys clears active client draft and legacy keys', () => {
    renewClientDraftSessionId();
    const cleared: string[] = [];
    clearClientDraftStorageKeys((key) => cleared.push(key));
    expect(cleared).toContain(getClientDraftSessionId());
    expect(cleared).toContain(DRAFT_SESSION_KEY);
  });
});
