import { migrateAbortControllerKey } from '../abortControllerMap.utils';

describe('migrateAbortControllerKey', () => {
  it('moves the abort controller to the new session key', () => {
    const map = new Map<string, AbortController>();
    const controller = new AbortController();
    map.set('cd_draft-a', controller);

    migrateAbortControllerKey(map, 'cd_draft-a', 'server-conv-id');

    expect(map.has('cd_draft-a')).toBe(false);
    expect(map.get('server-conv-id')).toBe(controller);
  });
});
