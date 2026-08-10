import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { resolveLocalImagePath, resolveReadFilePath } from './path-resolver';

jest.mock('../../active-code-project', () => ({
  getActiveCodeProjectRootPath: () => path.join(os.tmpdir(), 'aigenius-test-project'),
}));

describe('resolveLocalImagePath', () => {
  const projectRoot = path.join(os.tmpdir(), 'aigenius-test-project');
  let outsideImage: string;
  let insideImage: string;

  beforeAll(async () => {
    await fs.mkdir(projectRoot, { recursive: true });
    outsideImage = path.join(os.tmpdir(), `outside-image-${Date.now()}.png`);
    insideImage = path.join(projectRoot, 'inside.png');
    const pngHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    await fs.writeFile(outsideImage, pngHeader);
    await fs.writeFile(insideImage, pngHeader);
  });

  afterAll(async () => {
    await fs.unlink(outsideImage).catch(() => undefined);
    await fs.unlink(insideImage).catch(() => undefined);
    await fs.rm(projectRoot, { recursive: true, force: true }).catch(() => undefined);
  });

  it('allows absolute image paths outside the project root', async () => {
    const result = await resolveLocalImagePath(outsideImage);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.resolved).toBe(outsideImage);
    }
  });

  it('still scopes relative paths to the project root', async () => {
    const result = await resolveLocalImagePath('inside.png');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.resolved).toBe(insideImage);
    }
  });

  it('rejects non-image extensions', async () => {
    const txt = path.join(os.tmpdir(), `not-image-${Date.now()}.txt`);
    await fs.writeFile(txt, 'hello');
    const result = await resolveLocalImagePath(txt);
    expect(result.ok).toBe(false);
    await fs.unlink(txt);
  });
});

describe('resolveReadFilePath workspace guard', () => {
  it('still blocks absolute paths outside workspace', async () => {
    const projectRoot = path.join(os.tmpdir(), 'aigenius-test-project');
    const outsideTxt = path.join(os.tmpdir(), `outside-${Date.now()}.txt`);
    await fs.mkdir(projectRoot, { recursive: true });
    await fs.writeFile(outsideTxt, 'hello');
    const result = await resolveReadFilePath(outsideTxt);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/outside workspace root/i);
    }
    await fs.unlink(outsideTxt).catch(() => undefined);
  });

  it('allows absolute paths inside the active project root', async () => {
    const projectRoot = path.join(os.tmpdir(), 'aigenius-test-project');
    const insideTxt = path.join(projectRoot, `inside-${Date.now()}.txt`);
    await fs.mkdir(projectRoot, { recursive: true });
    await fs.writeFile(insideTxt, 'hello');
    const result = await resolveReadFilePath(insideTxt);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.resolved).toBe(insideTxt);
    }
    await fs.unlink(insideTxt).catch(() => undefined);
  });

  it('allows relative paths under the project root', async () => {
    const projectRoot = path.join(os.tmpdir(), 'aigenius-test-project');
    const relName = `relative-${Date.now()}.txt`;
    const insideTxt = path.join(projectRoot, relName);
    await fs.mkdir(projectRoot, { recursive: true });
    await fs.writeFile(insideTxt, 'hello');
    const result = await resolveReadFilePath(relName);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.resolved).toBe(insideTxt);
    }
    await fs.unlink(insideTxt).catch(() => undefined);
  });
});
