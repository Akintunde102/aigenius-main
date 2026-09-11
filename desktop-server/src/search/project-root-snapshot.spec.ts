import fs from 'fs';
import os from 'os';
import path from 'path';
import {
  buildDirectorySnapshot,
  buildProjectOverview,
  collectGitSnapshot,
  isProjectRootDirectory,
  resolveContextDirectoryPath,
} from './project-root-snapshot.js';
import { upsertFile } from './db/queries.js';
import { createTestSearchDb } from './__tests__/test-db.js';

function makeTempProject(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'aigenius-ctx-'));
  fs.writeFileSync(path.join(root, 'package.json'), '{"name":"demo"}\n');
  fs.mkdirSync(path.join(root, 'apps'));
  fs.mkdirSync(path.join(root, 'apps', 'web'));
  fs.writeFileSync(path.join(root, 'apps', 'web', 'package.json'), '{"name":"web"}\n');
  fs.writeFileSync(path.join(root, 'README.md'), '# Demo\n');
  return root;
}

function makeDb() {
  return createTestSearchDb();
}

describe('project-root-snapshot', () => {
  it('resolveContextDirectoryPath resolves absolute and relative paths', () => {
    const root = makeTempProject();
    const appsWeb = path.join(root, 'apps', 'web');
    expect(resolveContextDirectoryPath(root, root)).toBe(path.normalize(root));
    expect(resolveContextDirectoryPath('apps/web', root)).toBe(path.normalize(appsWeb));
    fs.rmSync(root, { recursive: true, force: true });
  });

  it('isProjectRootDirectory matches path_prefix and git root', () => {
    const root = makeTempProject();
    expect(isProjectRootDirectory(root, root)).toBe(true);
    expect(isProjectRootDirectory(path.join(root, 'apps', 'web'), root)).toBe(false);
    fs.rmSync(root, { recursive: true, force: true });
  });

  it('buildDirectorySnapshot lists top-level entries and entry points', () => {
    const root = makeTempProject();
    const db = makeDb();
    const snap = buildDirectorySnapshot(db, root);
    expect(snap.path).toBe(path.normalize(root));
    expect(snap.entries.some((e) => e.name === 'apps' && e.kind === 'directory')).toBe(true);
    expect(snap.entries.some((e) => e.name === 'package.json')).toBe(true);
    expect(snap.entryPoints).toContain('package.json');
    expect(snap.entryPoints).toContain('apps/');
    fs.rmSync(root, { recursive: true, force: true });
    db.close();
  });

  it('buildProjectOverview includes architecture markdown and indexed counts', () => {
    const root = makeTempProject();
    const db = makeDb();
    upsertFile(db, {
      path: path.join(root, 'README.md'),
      name: 'README.md',
      mtime: 1,
      content: '# hello',
      tags: '',
      extension: 'md',
    });
    const overview = buildProjectOverview(db, root);
    expect(overview.projectName).toBe(path.basename(root));
    expect(overview.indexedFiles).toBeGreaterThanOrEqual(1);
    expect(overview.architectureMarkdown).toContain('Project structural map');
    expect(overview.directory.entries.length).toBeGreaterThan(0);
    expect(overview.git).toBeDefined();
    fs.rmSync(root, { recursive: true, force: true });
    db.close();
  });

  it('collectGitSnapshot returns isRepo false outside git', () => {
    const root = makeTempProject();
    const snap = collectGitSnapshot(root);
    expect(snap.isRepo).toBe(false);
    fs.rmSync(root, { recursive: true, force: true });
  });
});
