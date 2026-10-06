import {
  getCodeProjectRootHealth,
  resetCodeProjectRootHealthStoreForTests,
  setCodeProjectRootHealthMap,
} from '../code-project-root-health-store';

describe('code-project-root-health-store', () => {
  beforeEach(() => {
    resetCodeProjectRootHealthStoreForTests();
  });

  it('stores and retrieves health by project id', () => {
    setCodeProjectRootHealthMap({
      p1: {
        projectId: 'p1',
        rootPath: '/a',
        status: 'missing',
        ok: false,
        canRecreate: true,
        checkedAtIso: '2026-01-01T00:00:00.000Z',
      },
    });
    expect(getCodeProjectRootHealth('p1')?.status).toBe('missing');
    expect(getCodeProjectRootHealth('p2')).toBeUndefined();
  });

  it('replaces map on each set', () => {
    setCodeProjectRootHealthMap({
      p1: {
        projectId: 'p1',
        rootPath: '/a',
        status: 'ok',
        ok: true,
        canRecreate: false,
        checkedAtIso: '2026-01-01T00:00:00.000Z',
      },
    });
    setCodeProjectRootHealthMap({});
    expect(getCodeProjectRootHealth('p1')).toBeUndefined();
  });
});
