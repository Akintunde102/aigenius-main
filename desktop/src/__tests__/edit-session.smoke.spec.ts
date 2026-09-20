import * as fs from 'fs';
import * as path from 'path';
import {
  recordTouchedFile,
  getTouchedFilesSnapshot,
  formatEditSessionHint,
  clearEditSession,
} from '../edit-session';

describe('edit-session', () => {
  beforeEach(() => {
    clearEditSession();
  });

  it('source file exists', () => {
    const source = path.join(__dirname, '..', 'edit-session.ts');
    expect(fs.existsSync(source)).toBe(true);
  });

  it('filters touched files by project root path', () => {
    const projectA = path.resolve('/projects/app-a');
    const projectB = path.resolve('/projects/app-b');

    const fileA1 = path.join(projectA, 'src', 'index.ts');
    const fileA2 = path.join(projectA, 'package.json');
    const fileB1 = path.join(projectB, 'src', 'main.ts');

    recordTouchedFile(fileA1);
    recordTouchedFile(fileA2);
    recordTouchedFile(fileB1);

    expect(getTouchedFilesSnapshot()).toHaveLength(3);

    const snapshotA = getTouchedFilesSnapshot(projectA);
    expect(snapshotA).toHaveLength(2);
    expect(snapshotA).toContain(fileA1);
    expect(snapshotA).toContain(fileA2);
    expect(snapshotA).not.toContain(fileB1);

    const hintA = formatEditSessionHint(projectA);
    expect(hintA).toContain(fileA1);
    expect(hintA).toContain(fileA2);
    expect(hintA).not.toContain(fileB1);

    const snapshotB = getTouchedFilesSnapshot(projectB);
    expect(snapshotB).toHaveLength(1);
    expect(snapshotB).toContain(fileB1);
  });
});

