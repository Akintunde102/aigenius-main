import {
  clearDocumentTextExtractCacheForTests,
  documentExtractKind,
  getDocumentTextLines,
} from './document-text-extract';

jest.mock('fs/promises', () => ({
  stat: jest.fn().mockResolvedValue({ mtimeMs: 42 }),
  readFile: jest.fn(),
}));

jest.mock('mammoth', () => ({
  extractRawText: jest.fn(),
}));

jest.mock('word-extractor', () => {
  return jest.fn().mockImplementation(() => ({
    extract: jest.fn(),
  }));
});

jest.mock('pdf-parse', () => jest.fn());

import fs from 'fs/promises';
import mammoth from 'mammoth';
import WordExtractor from 'word-extractor';
import pdfParse from 'pdf-parse';

const mammothMock = mammoth as jest.Mocked<typeof mammoth>;
const WordExtractorMock = WordExtractor as jest.MockedClass<typeof WordExtractor>;
const pdfParseMock = pdfParse as jest.MockedFunction<typeof pdfParse>;

describe('documentExtractKind', () => {
  it('detects .doc, .docx, and .pdf extensions', () => {
    expect(documentExtractKind('/tmp/report.doc')).toBe('doc');
    expect(documentExtractKind('/tmp/report.DOC')).toBe('doc');
    expect(documentExtractKind('/tmp/report.docx')).toBe('docx');
    expect(documentExtractKind('/tmp/slides.PDF')).toBe('pdf');
    expect(documentExtractKind('/tmp/report.txt')).toBeNull();
  });
});

describe('getDocumentTextLines', () => {
  beforeEach(() => {
    clearDocumentTextExtractCacheForTests();
    jest.clearAllMocks();
  });

  it('extracts .docx text via mammoth', async () => {
    mammothMock.extractRawText.mockResolvedValue({ value: 'Hello docx', messages: [] });

    const result = await getDocumentTextLines('/tmp/sample.docx', 'docx');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.lines).toEqual(['Hello docx']);
      expect(result.kind).toBe('docx');
    }
    expect(mammothMock.extractRawText).toHaveBeenCalledWith({ path: '/tmp/sample.docx' });
    expect(WordExtractorMock).not.toHaveBeenCalled();
  });

  it('extracts legacy .doc text via word-extractor', async () => {
    const extract = jest.fn().mockResolvedValue({ getBody: () => 'Hello legacy doc' });
    WordExtractorMock.mockImplementation(() => ({ extract }) as unknown as InstanceType<typeof WordExtractor>);

    const result = await getDocumentTextLines('/tmp/sample.doc', 'doc');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.lines).toEqual(['Hello legacy doc']);
      expect(result.kind).toBe('doc');
    }
    expect(extract).toHaveBeenCalledWith('/tmp/sample.doc');
    expect(mammothMock.extractRawText).not.toHaveBeenCalled();
  });

  it('extracts .pdf text via pdf-parse', async () => {
    (fs.readFile as jest.Mock).mockResolvedValue(Buffer.from('%PDF-1.4'));
    pdfParseMock.mockResolvedValue({ text: 'Slide deck content' } as Awaited<ReturnType<typeof pdfParse>>);

    const result = await getDocumentTextLines('/tmp/slides.pdf', 'pdf');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.lines).toEqual(['Slide deck content']);
      expect(result.kind).toBe('pdf');
    }
    expect(fs.readFile).toHaveBeenCalledWith('/tmp/slides.pdf');
    expect(pdfParseMock).toHaveBeenCalled();
  });

  it('returns a helpful error when extraction fails', async () => {
    mammothMock.extractRawText.mockRejectedValue(new Error('corrupt file'));

    const result = await getDocumentTextLines('/tmp/broken.docx', 'docx');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('could not extract text');
      expect(result.error).toContain('corrupt file');
    }
  });
});
