import fs from 'fs';
import os from 'os';
import path from 'path';
import {
  homedirIndexDbPath,
  projectIndexDbPath,
  registerProjectIndex,
  resolveProjectDbPath,
  setActiveProjectIndexId,
} from '../project-index-registry.js';
import {
  isPathUnderAnyRoot,
  resolveHomedirDbPathForDeviceFastIndex,
} from '../device-fast-index-db-routing.js';
import {
  baselineFastIndexDirectories,
  resolveStandardUserFolders,
} from '../indexer/device-known-folders.js';
import { buildDeviceFolderStructureMap } from '../indexer/device-folder-structure-map.js';
import {
  collectDeviceFastIndexPocketFiles,
  listDeviceFastIndexRoots,
  loadDeviceFastIndexPocketState,
  saveDeviceFastIndexPocketState,
  shouldRunInstallPocketPlanner,
} from '../indexer/device-fast-index-pocket.js';
import { isDeviceFastIndexEnabled } from '../indexer/device-fast-index-enabled.js';
import { computeCoreReady } from '../indexer-status-file.js';

describe('device fast index — scenario battery', () => {
  let userData: string;
  let pocketHome: string;
  let desktop: string;
  let projectRoot: string;

  beforeEach(() => {
    userData = fs.mkdtempSync(path.join(os.homedir(), 'aigenius-scenario-'));
    pocketHome = fs.mkdtempSync(path.join(os.homedir(), 'aigenius-pocket-home-'));
    desktop = path.join(pocketHome, 'Desktop');
    projectRoot = path.join(pocketHome, 'code-project');
    fs.mkdirSync(desktop, { recursive: true });
    fs.mkdirSync(projectRoot, { recursive: true });
    fs.writeFileSync(path.join(desktop, 'notes.txt'), 'device pocket note');
    fs.writeFileSync(path.join(projectRoot, 'main.ts'), 'export {}');
    delete process.env.AIGENIUS_DEVICE_FAST_INDEX;
    delete process.env.AIGENIUS_DEVICE_POCKET_PLANNER;
  });

  afterEach(() => {
    fs.rmSync(userData, { recursive: true, force: true });
    fs.rmSync(pocketHome, { recursive: true, force: true });
    delete process.env.OPENROUTER_API_KEY;
  });

  describe('feature flags', () => {
    it('device fast index is on unless AIGENIUS_DEVICE_FAST_INDEX=0', () => {
      expect(isDeviceFastIndexEnabled()).toBe(true);
      process.env.AIGENIUS_DEVICE_FAST_INDEX = '0';
      expect(isDeviceFastIndexEnabled()).toBe(false);
    });
  });

  describe('install planner gating', () => {
    it('runs install planner only when not completed and API key present', () => {
      process.env.OPENROUTER_API_KEY = 'k';
      expect(shouldRunInstallPocketPlanner(null)).toBe(true);
      expect(
        shouldRunInstallPocketPlanner({
          updated_at_ms: 1,
          baseline_directories: [],
          model_suggested_directories: [],
          planner_model: null,
          last_planner_run_ms: null,
          last_planner_error: null,
          install_planner_completed: true,
          install_planner_app_version: '1.0.0',
        }),
      ).toBe(false);
    });

    it('skips install planner when AIGENIUS_DEVICE_POCKET_PLANNER=0', () => {
      process.env.OPENROUTER_API_KEY = 'k';
      process.env.AIGENIUS_DEVICE_POCKET_PLANNER = '0';
      expect(shouldRunInstallPocketPlanner(null)).toBe(false);
    });
  });

  describe('SQLite routing', () => {
    it('routes path_prefix under saved Desktop to homedir-index.sqlite', () => {
      saveDeviceFastIndexPocketState(userData, {
        updated_at_ms: Date.now(),
        baseline_directories: [desktop],
        model_suggested_directories: [],
        planner_model: 'tencent/hy3',
        last_planner_run_ms: Date.now(),
        last_planner_error: null,
        install_planner_completed: true,
        install_planner_app_version: '1.0.0',
      });

      const resolved = resolveProjectDbPath({
        userData,
        pathPrefix: path.join(desktop, 'notes.txt'),
      });
      expect(resolved).toBe(homedirIndexDbPath(userData));
    });

    it('routes Hy3-suggested folder to homedir DB even when a code project is active', () => {
      const projectsDir = path.join(pocketHome, 'Projects');
      fs.mkdirSync(projectsDir);
      saveDeviceFastIndexPocketState(userData, {
        updated_at_ms: Date.now(),
        baseline_directories: [desktop],
        model_suggested_directories: [projectsDir],
        planner_model: 'tencent/hy3',
        last_planner_run_ms: Date.now(),
        last_planner_error: null,
        install_planner_completed: true,
        install_planner_app_version: '1.0.0',
      });

      const projectId = 'proj-1';
      registerProjectIndex(userData, { projectId, rootPath: projectRoot });
      setActiveProjectIndexId(userData, projectId);

      const underProject = resolveProjectDbPath({
        userData,
        pathPrefix: path.join(projectRoot, 'src'),
      });
      expect(underProject).toBe(projectIndexDbPath(userData, projectId));

      const underProjects = resolveProjectDbPath({
        userData,
        pathPrefix: projectsDir,
      });
      expect(underProjects).toBe(homedirIndexDbPath(userData));
    });

    it('isPathUnderAnyRoot rejects paths outside pocket roots', () => {
      expect(isPathUnderAnyRoot(path.join(pocketHome, 'Other', 'x.txt'), [desktop])).toBe(false);
      expect(isPathUnderAnyRoot(path.join(desktop, 'x.txt'), [desktop])).toBe(true);
    });

    it('prefers registered code project DB over device pocket parent folder', () => {
      const projectsDir = path.join(pocketHome, 'Projects');
      const appRoot = path.join(projectsDir, 'myapp');
      fs.mkdirSync(appRoot, { recursive: true });
      fs.writeFileSync(path.join(appRoot, 'main.ts'), 'export {}');
      saveDeviceFastIndexPocketState(userData, {
        updated_at_ms: Date.now(),
        baseline_directories: [desktop],
        model_suggested_directories: [projectsDir],
        planner_model: 'tencent/hy3',
        last_planner_run_ms: Date.now(),
        last_planner_error: null,
        install_planner_completed: true,
        install_planner_app_version: '1.0.0',
      });
      const projectId = 'myapp-proj';
      registerProjectIndex(userData, { projectId, rootPath: appRoot });
      setActiveProjectIndexId(userData, projectId);

      expect(
        resolveProjectDbPath({ userData, pathPrefix: path.join(appRoot, 'src') }),
      ).toBe(projectIndexDbPath(userData, projectId));
    });

    it('routes nested file under Hy3 Projects folder to homedir DB', () => {
      const projectsDir = path.join(pocketHome, 'Projects');
      fs.mkdirSync(projectsDir, { recursive: true });
      const nested = path.join(projectsDir, 'resume.pdf');
      fs.writeFileSync(nested, '%PDF-1.4');
      saveDeviceFastIndexPocketState(userData, {
        updated_at_ms: Date.now(),
        baseline_directories: [desktop],
        model_suggested_directories: [projectsDir],
        planner_model: 'tencent/hy3',
        last_planner_run_ms: Date.now(),
        last_planner_error: null,
        install_planner_completed: true,
        install_planner_app_version: '1.0.0',
      });
      registerProjectIndex(userData, { projectId: 'active', rootPath: projectRoot });
      setActiveProjectIndexId(userData, 'active');

      expect(
        resolveProjectDbPath({ userData, filePath: nested }),
      ).toBe(homedirIndexDbPath(userData));
    });

    it('resolveHomedirDbPathForDeviceFastIndex returns null for unrelated paths', () => {
      saveDeviceFastIndexPocketState(userData, {
        updated_at_ms: Date.now(),
        baseline_directories: [desktop],
        model_suggested_directories: [],
        planner_model: null,
        last_planner_run_ms: null,
        last_planner_error: null,
        install_planner_completed: false,
        install_planner_app_version: null,
      });
      expect(
        resolveHomedirDbPathForDeviceFastIndex(userData, ['/tmp/nowhere']),
      ).toBeNull();
    });
  });

  describe('collection and folder map', () => {
    it('collectDeviceFastIndexPocketFiles finds shallow files under configured dirs', () => {
      const files = collectDeviceFastIndexPocketFiles([desktop]);
      expect(files.some((p) => p.endsWith('notes.txt'))).toBe(true);
    });

    it('listDeviceFastIndexRoots merges state with existing directories only', () => {
      saveDeviceFastIndexPocketState(userData, {
        updated_at_ms: 1,
        baseline_directories: [desktop],
        model_suggested_directories: [path.join(pocketHome, 'missing-dir')],
        planner_model: null,
        last_planner_run_ms: null,
        last_planner_error: null,
        install_planner_completed: false,
        install_planner_app_version: null,
      });
      const roots = listDeviceFastIndexRoots(userData);
      expect(roots).toContain(path.normalize(desktop));
      expect(roots.some((r) => r.includes('missing-dir'))).toBe(false);
    });

    it('buildDeviceFolderStructureMap lists top-level without reading file bodies', () => {
      const map = buildDeviceFolderStructureMap();
      expect(map.home).toBeTruthy();
      expect(map.topLevel.length).toBeGreaterThan(0);
      expect(map.baselineFastDirs.length).toBeGreaterThanOrEqual(0);
    });

    it('baselineFastIndexDirectories returns real OS folders when they exist', () => {
      const folders = resolveStandardUserFolders();
      const baseline = baselineFastIndexDirectories();
      for (const p of baseline) {
        expect(fs.statSync(p).isDirectory()).toBe(true);
      }
      if (folders.desktop) expect(baseline).toContain(path.normalize(folders.desktop));
    });
  });

  describe('queue readiness semantics', () => {
    it('core_ready requires fast_pocket and project_core queues empty', () => {
      expect(
        computeCoreReady({
          fast_pocket: 0,
          project_core: 0,
          project_docs: 0,
          project_media: 0,
          idle_project: 0,
          background: 5,
        }),
      ).toBe(true);
      expect(
        computeCoreReady({
          fast_pocket: 1,
          project_core: 0,
          project_docs: 0,
          project_media: 0,
          idle_project: 0,
          background: 0,
        }),
      ).toBe(false);
    });
  });

  describe('state persistence', () => {
    it('round-trips install_planner fields', () => {
      saveDeviceFastIndexPocketState(userData, {
        updated_at_ms: 2,
        baseline_directories: [desktop],
        model_suggested_directories: [],
        planner_model: 'tencent/hy3',
        last_planner_run_ms: 2,
        last_planner_error: null,
        install_planner_completed: false,
        install_planner_app_version: null,
      });
      const loaded = loadDeviceFastIndexPocketState(userData);
      expect(loaded?.install_planner_completed).toBe(false);
      expect(loaded?.baseline_directories).toContain(path.normalize(desktop));
    });
  });
});
