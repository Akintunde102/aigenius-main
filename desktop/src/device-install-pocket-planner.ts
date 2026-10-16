import fs from 'fs';
import path from 'path';
import { app } from 'electron';
import { loopbackHttpUrl } from './loopback-host';
import { MINI_SERVER_PORT } from './mini-server-port';

const POCKET_STATE_FILE = 'device-fast-index-pocket.json';

function loadInstallPlannerCompleted(userDataPath: string): boolean {
  try {
    const raw = fs.readFileSync(path.join(userDataPath, POCKET_STATE_FILE), 'utf8');
    const state = JSON.parse(raw) as { install_planner_completed?: boolean };
    return state.install_planner_completed === true;
  } catch {
    return false;
  }
}

/**
 * After install (first launch until Hy3 planner succeeds), map extra home folders for fast indexing.
 */
export function scheduleDeviceInstallPocketPlanner(userDataPath: string): void {
  if (process.env.AIGENIUS_DEVICE_FAST_INDEX === '0') return;
  if (loadInstallPlannerCompleted(userDataPath)) return;

  const token = process.env.AIGENIUS_SECRET_TOKEN;
  if (!token) {
    console.warn('[aigenius-desktop] Install pocket planner skipped — missing AIGENIUS_SECRET_TOKEN');
    return;
  }

  const appVersion = app.getVersion();
  const port = MINI_SERVER_PORT;

  void (async () => {
    const deadline = Date.now() + 180_000;
    while (Date.now() < deadline) {
      try {
        const res = await fetch(loopbackHttpUrl(port, '/search/device-fast-index/run-install-planner'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ appVersion }),
        });
        if (res.ok) {
          const body = (await res.json()) as { completed?: boolean; error?: string | null };
          console.info('[aigenius-desktop] Install pocket planner:', body);
          return;
        }
      } catch {
        /* mini-server / indexer still starting */
      }
      await new Promise((r) => setTimeout(r, 2_000));
    }
    console.warn('[aigenius-desktop] Install pocket planner timed out waiting for sidecar/indexer');
  })();
}
