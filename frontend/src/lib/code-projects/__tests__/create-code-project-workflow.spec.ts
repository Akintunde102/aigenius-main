import { NAME_AND_FOLDER_REQUIRED, runCreateCodeProject } from '../create-code-project-workflow';
import type { CodeProject, CreateCodeProjectInput } from '@/lib/calls/code-projects';
import type { CreateCodeProjectWorkflowDeps } from '../create-code-project-workflow';

function project(partial: Partial<CodeProject> & Pick<CodeProject, 'id' | 'name' | 'rootPath'>): CodeProject {
  return {
    userId: 'user-1',
    rules: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...partial,
  };
}

function makeDeps(overrides: Partial<CreateCodeProjectWorkflowDeps> = {}): CreateCodeProjectWorkflowDeps {
  return {
    listProjects: jest.fn(async () => [] as CodeProject[]),
    createProject: jest.fn(async (input: CreateCodeProjectInput) =>
      project({ id: 'new', name: input.name, rootPath: input.rootPath, rules: input.rules ?? null }),
    ),
    updateProject: jest.fn(async (id: string, input: Partial<CreateCodeProjectInput>) =>
      project({ id, name: 'Demo', rootPath: '/docs/AIGenius Projects/Demo', rules: input.rules ?? null }),
    ),
    generateName: () => 'swift-harbor-42',
    createNamedFolder: jest.fn(async () => ({
      ok: true as const,
      path: '/docs/AIGenius Projects/Demo',
      created: true,
    })),
    isDesktop: () => true,
    notify: jest.fn(),
    selectAndScope: jest.fn(),
    ...overrides,
  };
}

describe('runCreateCodeProject', () => {
  it('silently creates a folder then registers the project on desktop', async () => {
    const deps = makeDeps();
    const result = await runCreateCodeProject({ name: 'Demo' }, deps);
    expect(deps.createNamedFolder).toHaveBeenCalledWith({ folderName: 'Demo', silent: true });
    expect(deps.createProject).toHaveBeenCalledWith({
      name: 'Demo',
      rootPath: '/docs/AIGenius Projects/Demo',
      rules: null,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.folderCreated).toBe(true);
      expect(result.reusedExistingProject).toBe(false);
      expect(deps.notify).toHaveBeenCalledWith({ action: 'created', project: result.project });
      expect(deps.selectAndScope).toHaveBeenCalledWith(result.project);
    }
  });

  it('reuses an existing directory and existing project instead of creating duplicates', async () => {
    const existing = project({
      id: 'p1',
      name: 'Demo',
      rootPath: '/docs/AIGenius Projects/Demo',
    });
    const deps = makeDeps({
      listProjects: jest.fn(async () => [existing]),
      createNamedFolder: jest.fn(async () => ({
        ok: true as const,
        path: '/docs/AIGenius Projects/Demo',
        created: false,
      })),
    });
    const result = await runCreateCodeProject({ name: 'Demo' }, deps);
    expect(deps.createProject).not.toHaveBeenCalled();
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.reusedExistingProject).toBe(true);
      expect(result.reusedExistingFolder).toBe(true);
      expect(result.folderCreated).toBe(false);
      expect(result.project.id).toBe('p1');
    }
  });

  it('uses a supplied rootPath without creating a folder', async () => {
    const deps = makeDeps();
    const result = await runCreateCodeProject(
      { name: 'api', rootPath: 'C:\\work\\api' },
      deps,
    );
    expect(deps.createNamedFolder).not.toHaveBeenCalled();
    expect(result.success).toBe(true);
    if (result.success) {
      expect(deps.createProject).toHaveBeenCalledWith({
        name: 'api',
        rootPath: 'C:\\work\\api',
        rules: null,
      });
    }
  });

  it('rejects web/name-only creates', async () => {
    const deps = makeDeps({ isDesktop: () => false });
    const result = await runCreateCodeProject({ name: 'Demo' }, deps);
    expect(result).toEqual({ success: false, error: NAME_AND_FOLDER_REQUIRED });
    expect(deps.createNamedFolder).not.toHaveBeenCalled();
    expect(deps.createProject).not.toHaveBeenCalled();
  });

  it('patches rules when reusing a project and rules are provided', async () => {
    const existing = project({
      id: 'p1',
      name: 'Demo',
      rootPath: 'C:\\work\\api',
      rules: 'old',
    });
    const deps = makeDeps({
      listProjects: jest.fn(async () => [existing]),
    });
    const result = await runCreateCodeProject(
      { rootPath: 'C:\\work\\api', rules: 'NestJS' },
      deps,
    );
    expect(deps.updateProject).toHaveBeenCalledWith('p1', { rules: 'NestJS' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.reusedExistingProject).toBe(true);
      expect(deps.notify).toHaveBeenCalledWith({
        action: 'updated',
        project: expect.objectContaining({ id: 'p1' }),
      });
    }
  });
});
