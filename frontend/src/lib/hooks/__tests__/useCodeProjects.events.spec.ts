/**
 * @jest-environment jsdom
 */
import { act, renderHook, waitFor } from '@testing-library/react';
import { notifyCodeProjectsChanged } from '@/lib/code-projects/code-projects-events';
import type { CodeProject } from '@/lib/calls/code-projects';

jest.mock('@/lib/hooks/useAuthReady', () => ({
  useAuthReady: () => true,
}));

jest.mock('@/lib/api/auth-client', () => ({
  subscribeToTokenRefresh: () => () => {},
}));

const listCodeProjects = jest.fn(async () => [] as CodeProject[]);

jest.mock('@/lib/calls/code-projects', () => ({
  listCodeProjects: (...args: unknown[]) => listCodeProjects(...args),
  createCodeProject: jest.fn(),
  updateCodeProject: jest.fn(),
  deleteCodeProject: jest.fn(),
}));

jest.mock('@/lib/code-projects/create-code-project-workflow', () => ({
  runCreateCodeProject: jest.fn(),
}));

import { useCodeProjects } from '../useCodeProjects';

describe('useCodeProjects event bus', () => {
  beforeEach(() => {
    listCodeProjects.mockReset();
    listCodeProjects.mockResolvedValue([]);
  });

  it('prepends a created project from the shared event without waiting for token refresh', async () => {
    const { result } = renderHook(() => useCodeProjects());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.projects).toEqual([]);

    const created: CodeProject = {
      id: 'p-new',
      userId: 'user-1',
      name: 'Demo',
      rootPath: '/docs/AIGenius Projects/Demo',
      rules: null,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };

    act(() => {
      notifyCodeProjectsChanged({ action: 'created', project: created });
    });

    expect(result.current.projects).toEqual([created]);

    act(() => {
      notifyCodeProjectsChanged({ action: 'created', project: { ...created, name: 'Dup' } });
    });
    expect(result.current.projects).toEqual([created]);
  });
});
