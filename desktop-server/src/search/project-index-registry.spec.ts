import path from 'path';
import fs from 'fs';
import os from 'os';
import {
  loadProjectIndexRegistry,
  projectIndexDbPath,
  registerProjectIndex,
  resolveProjectDbPath,
  setActiveProjectIndexId,
} from './project-index-registry.js';

describe('project-index-registry', () => {
  const userData = fs.mkdtempSync(path.join(os.tmpdir(), 'aigenius-registry-'));

  afterAll(() => {
    fs.rmSync(userData, { recursive: true, force: true });
  });

  it('registers and resolves project db by root path', () => {
    const projectId = 'abc-123';
    const rootPath = path.join(userData, 'MyProject');
    const entry = registerProjectIndex(userData, { projectId, rootPath });

    expect(entry.dbPath).toBe(projectIndexDbPath(userData, projectId));

    setActiveProjectIndexId(userData, projectId);
    const resolved = resolveProjectDbPath({
      userData,
      pathPrefix: path.join(rootPath, 'src'),
    });
    expect(resolved).toBe(entry.dbPath);
  });

  it('persists registry across loads', () => {
    const loaded = loadProjectIndexRegistry(userData);
    expect(loaded.projects.length).toBeGreaterThan(0);
    expect(loaded.activeProjectId).toBe('abc-123');
  });
});
