import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { applyLocalPatch } from '../local-apply-patch';

jest.mock('electron', () => ({
  app: {
    getPath: () => os.tmpdir(),
  },
  BrowserWindow: jest.fn(),
  dialog: {
    showMessageBox: jest.fn(),
  },
}));

jest.mock('../tool-permission-preferences', () => ({
  shouldRequireToolApproval: () => false,
}));

describe('applyLocalPatch (atomic & transactional)', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'patch-test-'));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
  });

  it('applies multiple operations atomically when all pass', async () => {
    const fileA = path.join(tempDir, 'fileA.txt');
    const fileB = path.join(tempDir, 'fileB.txt');

    await fs.writeFile(fileA, 'Line 1\nLine 2\nLine 3\n', 'utf8');

    const ops = [
      {
        op: 'apply_hunk',
        path: fileA,
        search: 'Line 2',
        replace: 'Line 2 replaced',
      },
      {
        op: 'create_file',
        path: fileB,
        content: 'Brand new file content',
      },
    ];

    const res = await applyLocalPatch(undefined, { operations: ops });
    expect(res.ok).toBe(true);

    const parsed = JSON.parse((res as { result: string }).result);
    expect(parsed.partial).toBe(false);
    expect(parsed.results).toHaveLength(2);
    expect(parsed.results[0].status).toBe('ok');
    expect(parsed.results[1].status).toBe('ok');

    const contentA = await fs.readFile(fileA, 'utf8');
    expect(contentA).toBe('Line 1\nLine 2 replaced\nLine 3\n');

    const contentB = await fs.readFile(fileB, 'utf8');
    expect(contentB).toBe('Brand new file content');
  });

  it('allows chaining multiple sequential hunks on the same file in a single batch', async () => {
    const fileA = path.join(tempDir, 'chained.txt');
    await fs.writeFile(fileA, 'foo\nbar\nbaz\n', 'utf8');

    const ops = [
      {
        op: 'apply_hunk',
        path: fileA,
        search: 'foo',
        replace: 'step1',
      },
      {
        op: 'apply_hunk',
        path: fileA,
        search: 'step1\nbar',
        replace: 'final_step\nbar_updated',
      },
    ];

    const res = await applyLocalPatch(undefined, { operations: ops });
    expect(res.ok).toBe(true);

    const parsed = JSON.parse((res as { result: string }).result);
    expect(parsed.partial).toBe(false);

    const content = await fs.readFile(fileA, 'utf8');
    expect(content).toBe('final_step\nbar_updated\nbaz\n');
  });

  it('aborts during pre-flight dry-run and modifies NO disk files if any hunk fails', async () => {
    const fileA = path.join(tempDir, 'fileA.txt');
    const fileB = path.join(tempDir, 'fileB.txt');

    const originalContentA = 'Initial content of A\nDo not change me if batch fails\n';
    await fs.writeFile(fileA, originalContentA, 'utf8');

    const ops = [
      {
        op: 'update_file',
        path: fileA,
        content: 'MODIFIED FILE A (SHOULD NEVER BE WRITTEN)',
      },
      {
        op: 'apply_hunk',
        path: fileA,
        search: 'NON_EXISTENT_SEARCH_STRING_THAT_CAUSES_FAILURE',
        replace: 'replacement',
      },
      {
        op: 'create_file',
        path: fileB,
        content: 'FILE B SHOULD NEVER BE CREATED',
      },
    ];

    const res = await applyLocalPatch(undefined, { operations: ops });
    expect(res.ok).toBe(true);

    const parsed = JSON.parse((res as { result: string }).result);
    expect(parsed.partial).toBe(false);
    expect(parsed.success).toBe(false);
    expect(parsed.error).toContain('Pre-flight dry-run failed');

    // Verify disk files remained completely untouched!
    const contentA = await fs.readFile(fileA, 'utf8');
    expect(contentA).toBe(originalContentA);

    let fileBExists = true;
    try {
      await fs.access(fileB);
    } catch {
      fileBExists = false;
    }
    expect(fileBExists).toBe(false);
  });

  it('fails pre-flight if create_file targets an existing file without touching other files', async () => {
    const fileA = path.join(tempDir, 'already_exists.txt');
    const fileB = path.join(tempDir, 'other.txt');

    await fs.writeFile(fileA, 'existing', 'utf8');
    await fs.writeFile(fileB, 'original other', 'utf8');

    const ops = [
      {
        op: 'update_file',
        path: fileB,
        content: 'attempted update',
      },
      {
        op: 'create_file',
        path: fileA,
        content: 'attempted overwrite',
      },
    ];

    const res = await applyLocalPatch(undefined, { operations: ops });
    const parsed = JSON.parse((res as { result: string }).result);
    expect(parsed.success).toBe(false);
    expect(parsed.error).toContain('create_file is exclusive');

    // Verify fileB was NOT updated on disk
    const contentB = await fs.readFile(fileB, 'utf8');
    expect(contentB).toBe('original other');
  });
});
