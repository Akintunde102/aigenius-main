import { renderHook, waitFor } from '@testing-library/react';
import { useCodeProjectRootHealth } from '../useCodeProjectRootHealth';
import { getCodeProjectRootHealth, resetCodeProjectRootHealthStoreForTests } from '@/lib/code-projects/code-project-root-health-store';

jest.mock('@/lib/utils/desktop-runtime', () => ({
  isAigeniusDesktopRuntime: () => true,
}));

jest.mock('@/lib/code-projects/fetch-code-project-root-health', () => ({
  fetchAllCodeProjectRootHealth: jest.fn(async (projects: Array<{ id: string }>) => {
    const map: Record<string, unknown> = {};
    for (const p of projects) {
      map[p.id] = {
        projectId: p.id,
        rootPath: '/x',
        status: 'missing',
        ok: false,
        canRecreate: true,
        checkedAtIso: '2026-01-01T00:00:00.000Z',
      };
    }
    return map;
  }),
  fetchCodeProjectRootHealth: jest.fn(),
}));

describe('useCodeProjectRootHealth', () => {
  beforeEach(() => {
    resetCodeProjectRootHealthStoreForTests();
  });

  it('loads health for all projects and syncs the global store', async () => {
    const { result } = renderHook(() =>
      useCodeProjectRootHealth([
        {
          id: 'p1',
          userId: 'u',
          name: 'A',
          rootPath: '/a',
          rules: null,
          createdAt: '',
          updatedAt: '',
        },
      ]),
    );
    await waitFor(() => {
      expect(result.current.healthByProjectId.p1?.status).toBe('missing');
    });
    expect(getCodeProjectRootHealth('p1')?.ok).toBe(false);
  });
});
