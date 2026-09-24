import { applyCodeProjectsChanged } from '../code-projects-events';
import type { CodeProject } from '@/lib/calls/code-projects';

function project(partial: Partial<CodeProject> & Pick<CodeProject, 'id' | 'name' | 'rootPath'>): CodeProject {
  return {
    userId: 'user-1',
    rules: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...partial,
  };
}

describe('applyCodeProjectsChanged', () => {
  const demo = project({ id: 'p1', name: 'Demo', rootPath: '/tmp/Demo' });

  it('prepends a created project when the id is new', () => {
    const next = applyCodeProjectsChanged([], { action: 'created', project: demo });
    expect(next).toEqual([demo]);
  });

  it('ignores a duplicate created id', () => {
    const next = applyCodeProjectsChanged([demo], { action: 'created', project: { ...demo, name: 'Other' } });
    expect(next).toEqual([demo]);
  });

  it('replaces an updated project', () => {
    const updated = { ...demo, name: 'Demo 2' };
    const next = applyCodeProjectsChanged([demo], { action: 'updated', project: updated });
    expect(next[0].name).toBe('Demo 2');
  });

  it('removes a deleted project', () => {
    const next = applyCodeProjectsChanged([demo], { action: 'deleted', id: 'p1' });
    expect(next).toEqual([]);
  });
});
