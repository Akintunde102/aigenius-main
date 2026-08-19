import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { resolveDirectoryPath, resolveLocalImagePath, resolveReadFilePath } from './path-resolver';

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
  it('allows absolute .docx outside project', async () => {
    const projectRoot = path.join(os.tmpdir(), 'aigenius-test-project');
    const outsideDocx = path.join(os.tmpdir(), `outside-${Date.now()}.docx`);
    await fs.mkdir(projectRoot, { recursive: true });
    await fs.writeFile(outsideDocx, 'docx');
    const result = await resolveReadFilePath(outsideDocx);
    expect(result.ok).toBe(true);
    await fs.unlink(outsideDocx).catch(() => undefined);
  });

  it('allows absolute non-document paths outside workspace', async () => {
    const projectRoot = path.join(os.tmpdir(), 'aigenius-test-project');
    const outsideTxt = path.join(os.tmpdir(), `outside-${Date.now()}.txt`);
    await fs.mkdir(projectRoot, { recursive: true });
    await fs.writeFile(outsideTxt, 'hello');
    const result = await resolveReadFilePath(outsideTxt);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.resolved).toBe(outsideTxt);
    }
    await fs.unlink(outsideTxt).catch(() => undefined);
  });

  it('blocks relative paths that escape workspace via traversal', async () => {
    const projectRoot = path.join(os.tmpdir(), 'aigenius-test-project');
    const outsideTxt = path.join(os.tmpdir(), `escape-${Date.now()}.txt`);
    await fs.mkdir(projectRoot, { recursive: true });
    await fs.writeFile(outsideTxt, 'escaped');
    const traversal = path.join('..', path.basename(outsideTxt));
    const result = await resolveReadFilePath(traversal);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/outside workspace root/i);
    }
    await fs.unlink(outsideTxt).catch(() => undefined);
  });

  it('allows absolute PDF paths outside the project root', async () => {
    const outsidePdf = path.join(os.tmpdir(), `outside-${Date.now()}.pdf`);
    await fs.writeFile(outsidePdf, '%PDF-1.4 sample');
    const result = await resolveReadFilePath(outsidePdf);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.resolved).toBe(outsidePdf);
    }
    await fs.unlink(outsidePdf).catch(() => undefined);
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

describe('resolveDirectoryPath', () => {
  it('allows absolute directory paths outside the project root', async () => {
    const outsideDir = path.join(os.tmpdir(), `outside-dir-${Date.now()}`);
    await fs.mkdir(outsideDir, { recursive: true });
    const result = await resolveDirectoryPath(outsideDir);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.resolved).toBe(outsideDir);
    }
    await fs.rm(outsideDir, { recursive: true, force: true }).catch(() => undefined);
  });

  it('allows relative directory paths under the project root', async () => {
    const projectRoot = path.join(os.tmpdir(), 'aigenius-test-project');
    const nestedDir = path.join(projectRoot, 'nested');
    await fs.mkdir(nestedDir, { recursive: true });
    const result = await resolveDirectoryPath('nested');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.resolved).toBe(nestedDir);
    }
    await fs.rm(projectRoot, { recursive: true, force: true }).catch(() => undefined);
  });

  it('rejects file paths that are not directories', async () => {
    const projectRoot = path.join(os.tmpdir(), 'aigenius-test-project');
    const filePath = path.join(projectRoot, 'file.txt');
    await fs.mkdir(projectRoot, { recursive: true });
    await fs.writeFile(filePath, 'hello');
    const result = await resolveDirectoryPath(filePath);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/not a directory/i);
    }
    await fs.rm(projectRoot, { recursive: true, force: true }).catch(() => undefined);
  });
});
