import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { executeReadFile } from './read-file-service';
import { createTestWorkspace } from './test-workspace';
import { resolveReadFilePath } from './path-resolver';

let workspaceRoot = '';

jest.mock('../../sidecar-fetch', () => ({
  sidecarFetch: jest.fn().mockResolvedValue({ ok: false, json: async () => ({}), text: async () => '' }),
}));

jest.mock('../../active-code-project', () => ({
  getActiveCodeProjectRootPath: () => workspaceRoot,
  getActiveCodeProjectId: () => 'test-project',
  setActiveCodeProjectIndex: jest.fn(),
}));

jest.mock('../../local-read-pdf', () => ({
  readPdfDocumentText: jest.fn(),
}));

import { readPdfDocumentText } from '../../local-read-pdf';
import { clearDocumentTextExtractCacheForTests } from './document-text-extract';

const readPdfMock = readPdfDocumentText as jest.MockedFunction<typeof readPdfDocumentText>;

describe('read-file PDF scenarios', () => {
  let outsidePdf = '';
  let outsideTxt = '';

  beforeAll(async () => {
    outsidePdf = path.join(os.tmpdir(), `outside-report-${Date.now()}.pdf`);
    outsideTxt = path.join(os.tmpdir(), `outside-notes-${Date.now()}.txt`);
    await fs.writeFile(outsidePdf, '%PDF-1.4');
    await fs.writeFile(outsideTxt, 'outside notes');
  });

  afterAll(async () => {
    await fs.unlink(outsidePdf).catch(() => undefined);
    await fs.unlink(outsideTxt).catch(() => undefined);
  });

  afterEach(async () => {
    clearDocumentTextExtractCacheForTests();
    if (workspaceRoot) {
      await fs.rm(workspaceRoot, { recursive: true, force: true });
      workspaceRoot = '';
    }
    jest.clearAllMocks();
    readPdfMock.mockReset();
  });

  it('allows absolute PDF path outside project (Downloads-style)', async () => {
    workspaceRoot = await createTestWorkspace();
    const resolved = await resolveReadFilePath(outsidePdf);
    expect(resolved.ok).toBe(true);
  });

  it('allows absolute .txt outside project', async () => {
    workspaceRoot = await createTestWorkspace();
    const resolved = await resolveReadFilePath(outsideTxt);
    expect(resolved.ok).toBe(true);
  });

  it('returns embedded PDF text with standard note', async () => {
    workspaceRoot = await createTestWorkspace();
    readPdfMock.mockResolvedValue({
      text: 'Invoice #8821 — amount due $1,200.00',
      method: 'text',
    });

    const batch = await executeReadFile({ path: outsidePdf });
    const item = batch.results[0]!;

    expect(item.status).toBe('ok');
    expect(item.content).toContain('Text extracted from PDF document');
    expect(item.content).toContain('Embedded text layer');
    expect(item.content).toContain('Invoice #8821');
  });

  it('returns OCR note for scanned PDF extraction', async () => {
    workspaceRoot = await createTestWorkspace();
    readPdfMock.mockResolvedValue({
      text: '--- Page 1 ---\nPatient name: Jane Doe',
      method: 'ocr',
    });

    const batch = await executeReadFile({ path: outsidePdf });
    const item = batch.results[0]!;

    expect(item.content).toContain('Text extracted from PDF via OCR');
    expect(item.content).toContain('Jane Doe');
  });

  it('batch-reads in-project PDF and outside PDF together', async () => {
    workspaceRoot = await createTestWorkspace({ 'docs/spec.pdf': '%PDF' });
    readPdfMock
      .mockResolvedValueOnce({ text: 'In-project spec section 3.2', method: 'text' })
      .mockResolvedValueOnce({ text: 'External resume — skills: TypeScript', method: 'text' });

    const batch = await executeReadFile({
      reads: [{ path: 'docs/spec.pdf' }, { path: outsidePdf }],
      model_context_length: 128_000,
    });

    expect(batch.results).toHaveLength(2);
    expect(batch.results[0]?.content).toContain('In-project spec');
    expect(batch.results[1]?.content).toContain('External resume');
  });

  it('surfaces PDF extraction failure to the agent', async () => {
    workspaceRoot = await createTestWorkspace();
    readPdfMock.mockRejectedValue(new Error('encrypted PDF'));

    const batch = await executeReadFile({ path: outsidePdf });
    expect(batch.results[0]?.status).toBe('error');
    expect(batch.results[0]?.content).toContain('encrypted PDF');
  });

  it('Windows path with spaces resolves for PDF', async () => {
    workspaceRoot = await createTestWorkspace();
    const spaced = path.join(os.tmpdir(), `My Docs ${Date.now()}`, 'Cover Letter.pdf');
    await fs.mkdir(path.dirname(spaced), { recursive: true });
    await fs.writeFile(spaced, '%PDF-1.4');

    const resolved = await resolveReadFilePath(spaced);
    expect(resolved.ok).toBe(true);

    await fs.rm(path.dirname(spaced), { recursive: true, force: true });
  });
});
