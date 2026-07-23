import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { resolveReadFilePath } from './path-resolver';

let workspaceRoot = '';

jest.mock('../../active-code-project', () => ({
  getActiveCodeProjectRootPath: () => workspaceRoot,
  getActiveCodeProjectId: () => 'test-project',
  setActiveCodeProjectIndex: jest.fn(),
}));

describe('path-resolver', () => {
  beforeEach(async () => {
    workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'read-path-'));
    await fs.mkdir(path.join(workspaceRoot, 'src'), { recursive: true });
    await fs.writeFile(path.join(workspaceRoot, 'src', 'app.ts'), 'export {};\n', { encoding: 'utf8' });
  });

  afterEach(async () => {
    if (workspaceRoot) {
      await fs.rm(workspaceRoot, { recursive: true, force: true });
    }
  });

  it('resolves workspace-relative paths', async () => {
    const r = await resolveReadFilePath('src/app.ts');
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.displayPath).toBe('src/app.ts');
    }
  });

  it('resolves absolute paths under workspace', async () => {
    const abs = path.join(workspaceRoot, 'src', 'app.ts');
    const r = await resolveReadFilePath(abs);
    expect(r.ok).toBe(true);
  });

  it('rejects path traversal outside workspace (LLM ../ escape)', async () => {
    const outside = path.join(workspaceRoot, '..', 'outside-secret.txt');
    await fs.writeFile(outside, 'secret', 'utf8');
    const rel = path.relative(workspaceRoot, outside);
    const r = await resolveReadFilePath(rel);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error).toContain('access denied');
    }
    await fs.rm(outside, { force: true });
  });

  it('returns file not found for missing paths', async () => {
    const r = await resolveReadFilePath('does/not/exist.ts');
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error).toContain('file not found');
    }
  });

  it('rejects directories (LLM passes folder path)', async () => {
    const r = await resolveReadFilePath('src');
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error).toContain('not a file');
    }
  });

  it('rejects empty path', async () => {
    const r = await resolveReadFilePath('   ');
    expect(r.ok).toBe(false);
  });
});
