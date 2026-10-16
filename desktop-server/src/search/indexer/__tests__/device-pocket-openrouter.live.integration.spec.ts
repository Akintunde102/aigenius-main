/**
 * Optional live OpenRouter call — cheap model by default (override with AIGENIUS_DEVICE_POCKET_MODEL).
 * RUN_DEVICE_POCKET_LIVE=1 && OPENROUTER_API_KEY=...
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import { buildDeviceFolderStructureMap } from '../device-folder-structure-map.js';
import { planAdditionalFastIndexDirectories } from '../device-pocket-openrouter.js';

const runLive = process.env.RUN_DEVICE_POCKET_LIVE === '1';
const hasKey = Boolean(
  process.env.OPENROUTER_API_KEY?.trim() || process.env.PROVIDER_OPENROUTER_API_KEY?.trim(),
);

describe('device-pocket-openrouter live', () => {
  (runLive && hasKey ? it : it.skip)(
    'calls OpenRouter with a cheap model and returns JSON additional_directories',
    async () => {
      const cheapModel = process.env.AIGENIUS_DEVICE_POCKET_MODEL?.trim() || 'google/gemini-2.5-flash';
      process.env.AIGENIUS_DEVICE_POCKET_MODEL = cheapModel;

      const tmpHome = fs.mkdtempSync(path.join(os.homedir(), 'aigenius-live-pocket-'));
      try {
        for (const name of ['Desktop', 'Documents', 'Downloads', 'Projects']) {
          fs.mkdirSync(path.join(tmpHome, name), { recursive: true });
        }

        const map = buildDeviceFolderStructureMap();
        const result = await planAdditionalFastIndexDirectories(map);

        expect(typeof result.model).toBe('string');
        expect(Array.isArray(result.additionalDirectories)).toBe(true);
        for (const dir of result.additionalDirectories) {
          expect(dir).not.toMatch(/node_modules/i);
        }
      } finally {
        fs.rmSync(tmpHome, { recursive: true, force: true });
      }
    },
    120_000,
  );
});
