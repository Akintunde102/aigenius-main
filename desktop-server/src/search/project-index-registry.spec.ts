import path from 'path';
import fs from 'fs';
import os from 'os';
import {
  homedirIndexDbPath,
  loadProjectIndexRegistry,
  projectIndexDbPath,
  registerProjectIndex,
  resolveProjectDbPath,
  setActiveProjectIndexId,
} from './project-index-registry.js';
import { saveDeviceFastIndexPocketState } from './indexer/device-fast-index-pocket.js';

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

  it('prefers homedir-index.sqlite for device pocket paths before auto-registering a folder as a project', () => {
    const pocketDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aigenius-pocket-'));
    const desktop = path.join(pocketDir, 'Desktop');
    fs.mkdirSync(desktop, { recursive: true });

    saveDeviceFastIndexPocketState(userData, {
      updated_at_ms: Date.now(),
      baseline_directories: [desktop],
      model_suggested_directories: [],
      planner_model: null,
      last_planner_run_ms: null,
      last_planner_error: null,
      install_planner_completed: true,
      install_planner_app_version: '1.0.0',
    });

    const resolved = resolveProjectDbPath({
      userData,
      pathPrefix: desktop,
    });
    expect(resolved).toBe(homedirIndexDbPath(userData));

    fs.rmSync(pocketDir, { recursive: true, force: true });
  });
});
