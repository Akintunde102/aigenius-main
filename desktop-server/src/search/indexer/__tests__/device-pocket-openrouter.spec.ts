import fs from 'fs';
import os from 'os';
import path from 'path';
import type { DeviceFolderStructureMap } from '../device-folder-structure-map.js';
import { planAdditionalFastIndexDirectories } from '../device-pocket-openrouter.js';

describe('device-pocket-openrouter', () => {
  let tmpHome: string;
  let map: DeviceFolderStructureMap;

  beforeEach(() => {
    tmpHome = fs.mkdtempSync(path.join(os.homedir(), 'aigenius-planner-'));
    const desktop = path.join(tmpHome, 'Desktop');
    const documents = path.join(tmpHome, 'Documents');
    const downloads = path.join(tmpHome, 'Downloads');
    const projects = path.join(tmpHome, 'Projects');
    fs.mkdirSync(desktop);
    fs.mkdirSync(documents);
    fs.mkdirSync(downloads);
    fs.mkdirSync(projects);
    map = {
      home: tmpHome,
      platform: process.platform,
      baselineFastDirs: [desktop, documents, downloads],
      topLevel: [
        {
          name: 'Projects',
          absPath: projects,
          kind: 'directory',
          childDirNames: ['app'],
        },
      ],
    };
  });

  afterEach(() => {
    fs.rmSync(tmpHome, { recursive: true, force: true });
  });

  beforeEach(() => {
    process.env.OPENROUTER_API_KEY = 'test-key';
    delete process.env.AIGENIUS_DEVICE_POCKET_PLANNER;
  });

  it('parses Hy3 JSON additional_directories from chat response', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: `{"additional_directories":["Projects",${JSON.stringify(path.join(tmpHome, 'Desktop'))}]}`,
            },
          },
        ],
      }),
    });

    const result = await planAdditionalFastIndexDirectories(map, fetchMock as typeof fetch);
    expect(result.additionalDirectories).toEqual([path.join(tmpHome, 'Projects')]);
    expect(fetchMock).toHaveBeenCalled();
    const body = JSON.parse(String(fetchMock.mock.calls[0]![1]?.body));
    expect(body.model).toMatch(/hy3/i);
  });

  it('filters paths already chosen or under registered code projects', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({
                additional_directories: [
                  'Projects',
                  path.join(tmpHome, 'Desktop'),
                  path.join(tmpHome, 'Projects', 'app'),
                ],
              }),
            },
          },
        ],
      }),
    });
    const appRoot = path.join(tmpHome, 'Projects', 'app');
    const result = await planAdditionalFastIndexDirectories(
      map,
      fetchMock as typeof fetch,
      {
        existingSuggestedDirectories: [path.join(tmpHome, 'OldPick')],
        registeredCodeProjectRoots: [appRoot],
      },
    );
    expect(result.additionalDirectories).toEqual([path.join(tmpHome, 'Projects')]);
  });

  it('skips planner when API key is missing', async () => {
    delete process.env.OPENROUTER_API_KEY;
    delete process.env.PROVIDER_OPENROUTER_API_KEY;
    const fetchMock = jest.fn();
    const result = await planAdditionalFastIndexDirectories(map, fetchMock as typeof fetch);
    expect(result.additionalDirectories).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
