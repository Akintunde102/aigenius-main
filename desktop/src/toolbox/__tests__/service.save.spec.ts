import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { ToolboxService, resetToolboxServiceForTests } from '../service';
import type { ToolboxApprovalPayload } from '../types';

describe('ToolboxService save', () => {
  let tmpUserData: string;
  let svc: ToolboxService | null = null;

  beforeEach(async () => {
    resetToolboxServiceForTests();
    tmpUserData = await fs.mkdtemp(path.join(os.tmpdir(), 'aig-toolbox-'));
  });

  afterEach(async () => {
    svc?.close();
    svc = null;
    resetToolboxServiceForTests();
    await new Promise((r) => setTimeout(r, 50));
    await fs.rm(tmpUserData, { recursive: true, force: true });
  });

  const validSaveArgs = {
    mode: 'create',
    scope: 'global',
    name: 'list-top-files',
    description:
      'Use when you need the largest files under a folder. Input: root path as arg0. Prints JSON lines of path and size.',
    runtime: 'node',
    entry: 'main.js',
    keywords: ['files', 'size'],
    flags: [] as string[],
    files: [{ path: 'main.js', content: 'console.log(JSON.stringify({ ok: true }));' }],
  };

  it('declined save writes nothing but still showed code to the gate', async () => {
    const shown: ToolboxApprovalPayload[] = [];
    svc = new ToolboxService(tmpUserData);
    const res = await svc.save(
      validSaveArgs,
      { activeCodeProjectId: null, activeCodeProjectRootPath: null },
      undefined,
      async (_parent, payload) => {
        shown.push(payload);
        return false;
      },
    );
    expect(res.ok).toBe(false);
    expect(shown.length).toBe(1);
    expect(shown[0].files[0].content).toContain('console.log');
    const globalDir = path.join(tmpUserData, 'toolbox', 'tools', 'global', 'list-top-files');
    await expect(fs.access(globalDir)).rejects.toThrow();
  });

  it('approved save is searchable', async () => {
    svc = new ToolboxService(tmpUserData);
    const res = await svc.save(
      validSaveArgs,
      { activeCodeProjectId: null, activeCodeProjectRootPath: null },
      undefined,
      async () => true,
    );
    expect(res.ok).toBe(true);
    const search = await svc.search('largest files folder', 6, {
      activeCodeProjectId: null,
      activeCodeProjectRootPath: null,
    });
    expect(search.matches.length + (search.allTools?.length ?? 0)).toBeGreaterThan(0);
  });

  it('allows active project to access global tool when no project tool exists', async () => {
    svc = new ToolboxService(tmpUserData);
    await svc.save(
      validSaveArgs,
      { activeCodeProjectId: null, activeCodeProjectRootPath: null },
      undefined,
      async () => true,
    );
    const getRes = await svc.get('list-top-files', {
      activeCodeProjectId: 'proj-123',
      activeCodeProjectRootPath: '/workspace/project',
    });
    expect(getRes.ok).toBe(true);
    if (getRes.ok) {
      expect(getRes.scope).toBe('global');
    }
  });

  it('prioritizes project tool over global tool when names collide', async () => {
    svc = new ToolboxService(tmpUserData);
    // 1. Save global tool
    await svc.save(
      validSaveArgs,
      { activeCodeProjectId: null, activeCodeProjectRootPath: null },
      undefined,
      async () => true,
    );
    // 2. Save project tool with same name
    const projectSaveArgs = {
      ...validSaveArgs,
      scope: 'project',
      description: 'Project specific tool for largest files in this repo only.',
    };
    await svc.save(
      projectSaveArgs,
      { activeCodeProjectId: 'proj-123', activeCodeProjectRootPath: '/workspace/project' },
      undefined,
      async () => true,
    );

    // 3. Resolve without scope: project tool should win
    const getRes = await svc.get('list-top-files', {
      activeCodeProjectId: 'proj-123',
      activeCodeProjectRootPath: '/workspace/project',
    });
    expect(getRes.ok).toBe(true);
    if (getRes.ok) {
      expect(getRes.scope).toBe('project');
      expect(getRes.description).toContain('Project specific tool');
    }

    // 4. In another project, global tool is returned
    const otherGetRes = await svc.get('list-top-files', {
      activeCodeProjectId: 'proj-456',
      activeCodeProjectRootPath: '/workspace/other',
    });
    expect(otherGetRes.ok).toBe(true);
    if (otherGetRes.ok) {
      expect(otherGetRes.scope).toBe('global');
    }
  });

  it('prunes history versions keeping only the last 5 versions', async () => {
    svc = new ToolboxService(tmpUserData);
    await svc.save(
      validSaveArgs,
      { activeCodeProjectId: null, activeCodeProjectRootPath: null },
      undefined,
      async () => true,
    );

    for (let i = 2; i <= 8; i++) {
      const updateArgs = {
        ...validSaveArgs,
        mode: 'update',
        description: `Version ${i} description for largest files in a folder.`,
      };
      const res = await svc.save(
        updateArgs,
        { activeCodeProjectId: null, activeCodeProjectRootPath: null },
        undefined,
        async () => true,
      );
      expect(res.ok).toBe(true);
      await new Promise((r) => setTimeout(r, 10));
    }

    const histParent = path.join(tmpUserData, 'toolbox', 'history', 'global', 'list-top-files');
    const entries = await fs.readdir(histParent);
    expect(entries.length).toBeLessThanOrEqual(5);
  }, 15_000);

  it('refuses invalid file paths with colons or null bytes', async () => {
    svc = new ToolboxService(tmpUserData);
    const badArgs = {
      ...validSaveArgs,
      files: [{ path: 'test.js:stream', content: 'console.log(1);' }],
    };
    const res = await svc.save(
      badArgs,
      { activeCodeProjectId: null, activeCodeProjectRootPath: null },
      undefined,
      async () => true,
    );
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error).toContain('invalid path');
    }
  });
});
