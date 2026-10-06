import type { CodeProject } from '@/lib/calls/code-projects';
import { runRelinkCodeProjectWorkflow } from '../relink-code-project-workflow';

function project(partial: Partial<CodeProject> & Pick<CodeProject, 'id' | 'rootPath'>): CodeProject {
  return {
    userId: 'u1',
    name: 'Demo',
    rules: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...partial,
  };
}

describe('runRelinkCodeProjectWorkflow', () => {
  it('updates project path after picker', async () => {
    const updated = project({ id: 'p1', rootPath: '/new/path' });
    const updateProject = jest.fn(async () => updated);
    const syncDesktop = jest.fn(async () => undefined);
    const clearDismiss = jest.fn();
    const result = await runRelinkCodeProjectWorkflow(project({ id: 'p1', rootPath: '/old/path' }), {
      pickDirectory: async () => ({ path: '/new/path' }),
      updateProject,
      syncDesktop,
      clearDismiss,
    });
    expect(result.success).toBe(true);
    expect(updateProject).toHaveBeenCalledWith('p1', { rootPath: '/new/path' });
    expect(syncDesktop).toHaveBeenCalledWith(updated);
    expect(clearDismiss).toHaveBeenCalledWith('p1');
  });

  it('rejects picking the same path', async () => {
    const result = await runRelinkCodeProjectWorkflow(project({ id: 'p1', rootPath: 'C:\\work\\a' }), {
      pickDirectory: async () => ({ path: 'c:/work/a' }),
      updateProject: jest.fn(),
      syncDesktop: jest.fn(),
      clearDismiss: jest.fn(),
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/already linked/i);
    }
  });

  it('returns canceled when picker returns null', async () => {
    const result = await runRelinkCodeProjectWorkflow(project({ id: 'p1', rootPath: '/a' }), {
      pickDirectory: async () => null,
      updateProject: jest.fn(),
      syncDesktop: jest.fn(),
      clearDismiss: jest.fn(),
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.canceled).toBe(true);
    }
  });
});
