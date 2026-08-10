import { executeReadFile } from './read-file-service';

jest.mock('./path-resolver', () => ({
  resolveReadFilePath: jest.fn(async (inputPath: string) => ({
    ok: true,
    resolved: inputPath,
    displayPath: inputPath,
  })),
}));

jest.mock('./binary-detect', () => ({
  isBinaryFile: jest.fn().mockResolvedValue(true),
}));

jest.mock('./document-text-extract', () => ({
  documentExtractKind: jest.fn((filePath: string) => {
    if (filePath.endsWith('.doc')) return 'doc';
    if (filePath.endsWith('.docx')) return 'docx';
    if (filePath.endsWith('.pdf')) return 'pdf';
    return null;
  }),
  getDocumentTextLines: jest.fn(async (filePath: string, kind: 'doc' | 'docx' | 'pdf') => ({
    ok: true,
    lines: [`Extracted ${kind} content from ${filePath}`],
    kind,
  })),
}));

describe('executeReadFile document extraction', () => {
  it('reads legacy .doc via text extraction instead of binary rejection', async () => {
    const result = await executeReadFile({ path: '/docs/report.doc' });

    expect(result.results[0]?.status).toBe('ok');
    expect(result.results[0]?.content).toContain('Text extracted from legacy Word document (.doc)');
    expect(result.results[0]?.content).toContain('Extracted doc content');
  });

  it('reads .docx via text extraction', async () => {
    const result = await executeReadFile({ path: '/docs/report.docx' });

    expect(result.results[0]?.status).toBe('ok');
    expect(result.results[0]?.content).toContain('Text extracted from Word document (.docx)');
    expect(result.results[0]?.content).toContain('Extracted docx content');
  });

  it('reads .pdf via text extraction instead of binary rejection', async () => {
    const result = await executeReadFile({
      path: 'C:\\Users\\user\\Documents\\OLUBAJU OLUWADAMILOLA SLIDES.pdf',
    });

    expect(result.results[0]?.status).toBe('ok');
    expect(result.results[0]?.content).toContain('Text extracted from PDF document (.pdf)');
    expect(result.results[0]?.content).toContain('Extracted pdf content');
  });
});
