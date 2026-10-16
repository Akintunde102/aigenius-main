import fs from 'fs';
import os from 'os';
import path from 'path';
import {
  collectDeviceFastIndexPocketFiles,
  saveDeviceFastIndexPocketState,
  loadDeviceFastIndexPocketState,
  shouldRunInstallPocketPlanner,
} from '../device-fast-index-pocket.js';

describe('device-fast-index-pocket', () => {
  let tmpHome: string;

  beforeEach(() => {
    tmpHome = fs.mkdtempSync(path.join(os.homedir(), 'aigenius-device-pocket-'));
    fs.mkdirSync(path.join(tmpHome, 'Desktop'));
    fs.writeFileSync(path.join(tmpHome, 'Desktop', 'note.txt'), 'hello');
  });

  afterEach(() => {
    fs.rmSync(tmpHome, { recursive: true, force: true });
  });

  it('collectDeviceFastIndexPocketFiles gathers shallow files under given dirs', () => {
    const desktop = path.join(tmpHome, 'Desktop');
    const files = collectDeviceFastIndexPocketFiles([desktop]);
    expect(files.some((p) => p.endsWith('note.txt'))).toBe(true);
  });

  it('shouldRunInstallPocketPlanner is false after install completed', () => {
    process.env.OPENROUTER_API_KEY = 'k';
    expect(
      shouldRunInstallPocketPlanner({
        updated_at_ms: 1,
        baseline_directories: [],
        model_suggested_directories: [],
        planner_model: 'tencent/hy3',
        last_planner_run_ms: 1,
        last_planner_error: null,
        install_planner_completed: true,
        install_planner_app_version: '1',
      }),
    ).toBe(false);
  });

  it('persists planner state under userData', () => {
    const userData = path.join(tmpHome, 'userdata');
    fs.mkdirSync(userData);
    saveDeviceFastIndexPocketState(userData, {
      updated_at_ms: 1,
      baseline_directories: [path.join(tmpHome, 'Desktop')],
      model_suggested_directories: [path.join(tmpHome, 'Projects')],
      planner_model: 'tencent/hy3',
      last_planner_run_ms: 1,
      last_planner_error: null,
      install_planner_completed: true,
      install_planner_app_version: '1.0.0',
    });
    const loaded = loadDeviceFastIndexPocketState(userData);
    expect(loaded?.model_suggested_directories).toHaveLength(1);
  });
});
