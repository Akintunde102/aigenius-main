import fs from 'fs';
import os from 'os';
import path from 'path';
import {
  homedirIndexDbPath,
  projectIndexDbPath,
  registerProjectIndex,
} from '../project-index-registry.js';
import { saveDeviceFastIndexPocketState } from '../indexer/device-fast-index-pocket.js';
import { checkSemanticIndexAccess } from '../local-semantic-index-guard.js';
import { writeIndexerStatusFile } from '../indexer-status-file.js';

describe('local-semantic-index-guard', () => {
  let userData: string;
  let desktop: string;

  beforeEach(() => {
    userData = fs.mkdtempSync(path.join(os.homedir(), 'aigenius-guard-'));
    desktop = path.join(userData, 'Desktop');
    fs.mkdirSync(desktop, { recursive: true });
    saveDeviceFastIndexPocketState(userData, {
      updated_at_ms: 1,
      baseline_directories: [desktop],
      model_suggested_directories: [],
      planner_model: null,
      last_planner_run_ms: null,
      last_planner_error: null,
      install_planner_completed: true,
      install_planner_app_version: '1.0.0',
    });
    writeIndexerStatusFile(userData, {
      updated_at_ms: Date.now(),
      db_path: homedirIndexDbPath(userData),
      project_root: null,
      watching: true,
      indexed: 0,
      last_run: 0,
      scan_in_progress: false,
      queue_depth: 0,
      queue_by_tier: {
        fast_pocket: 0,
        project_core: 0,
        project_docs: 0,
        project_media: 0,
        idle_project: 0,
        background: 0,
      },
      core_ready: true,
      enrichment_ready: true,
    });
  });

  afterEach(() => {
    fs.rmSync(userData, { recursive: true, force: true });
  });

  it('allows RAG under desktop when fast pocket queue is idle', () => {
    const result = checkSemanticIndexAccess(
      userData,
      { pathPrefix: path.join(desktop, 'notes.txt') },
      'rag',
    );
    expect(result.allowed).toBe(true);
    if (result.allowed) {
      expect(result.scope).toBe('device_pocket');
    }
  });

  it('blocks RAG on desktop while fast_pocket queue has work', () => {
    writeIndexerStatusFile(userData, {
      updated_at_ms: Date.now(),
      db_path: homedirIndexDbPath(userData),
      project_root: null,
      watching: true,
      indexed: 0,
      last_run: 0,
      scan_in_progress: true,
      queue_depth: 2,
      queue_by_tier: {
        fast_pocket: 2,
        project_core: 0,
        project_docs: 0,
        project_media: 0,
        idle_project: 0,
        background: 0,
      },
      core_ready: false,
      enrichment_ready: false,
    });
    const result = checkSemanticIndexAccess(userData, { pathPrefix: desktop }, 'rag');
    expect(result.allowed).toBe(false);
  });

  it('blocks symbol tools until project index is ready', () => {
    const root = path.join(userData, 'code');
    fs.mkdirSync(root, { recursive: true });
    const projectId = 'p1';
    registerProjectIndex(userData, { projectId, rootPath: root });
    writeIndexerStatusFile(userData, {
      updated_at_ms: Date.now(),
      db_path: projectIndexDbPath(userData, projectId),
      project_root: root,
      active_project_id: projectId,
      projects: [{
        project_id: projectId,
        project_root: root,
        db_path: projectIndexDbPath(userData, projectId),
        indexed: 0,
        last_run: 0,
        is_active: true,
        watching: true,
        index_ready: false,
      }],
      watching: true,
      indexed: 0,
      last_run: 0,
      scan_in_progress: true,
      queue_depth: 1,
      queue_by_tier: {
        fast_pocket: 0,
        project_core: 1,
        project_docs: 0,
        project_media: 0,
        idle_project: 0,
        background: 0,
      },
      core_ready: false,
      enrichment_ready: false,
    });
    const result = checkSemanticIndexAccess(
      userData,
      { filePath: path.join(root, 'main.ts') },
      'symbols',
    );
    expect(result.allowed).toBe(false);
  });
});
