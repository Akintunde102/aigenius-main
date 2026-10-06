import type { CodeProject } from '@/lib/calls/code-projects';
import { runRecreateCodeProjectRootWorkflow } from '../recreate-code-project-root-workflow';

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

describe('runRecreateCodeProjectRootWorkflow', () => {
  it('syncs desktop after recreate', async () => {
    const syncDesktop = jest.fn(async () => undefined);
    const refreshHealth = jest.fn(async () => undefined);
    const clearDismiss = jest.fn();
    const result = await runRecreateCodeProjectRootWorkflow(project({ id: 'p1', rootPath: '/tmp/p' }), {
      recreateRoot: async () => ({ ok: true, path: '/tmp/p', created: true }),
      syncDesktop,
      clearDismiss,
      refreshHealth,
    });
    expect(result.success).toBe(true);
    expect(syncDesktop).toHaveBeenCalled();
    expect(refreshHealth).toHaveBeenCalledWith({ id: 'p1', rootPath: '/tmp/p' });
    expect(clearDismiss).toHaveBeenCalledWith('p1');
  });

  it('surfaces recreate errors', async () => {
    const result = await runRecreateCodeProjectRootWorkflow(project({ id: 'p1', rootPath: '/tmp/p' }), {
      recreateRoot: async () => ({ ok: false, error: 'nope' }),
      syncDesktop: jest.fn(),
      clearDismiss: jest.fn(),
      refreshHealth: jest.fn(),
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('nope');
    }
  });
});
