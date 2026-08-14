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

jest.mock('../../local-read-pdf', () => ({
  readPdfDocumentText: jest.fn(),
}));

import fs from 'fs/promises';
import mammoth from 'mammoth';
import WordExtractor from 'word-extractor';
import { readPdfDocumentText } from '../../local-read-pdf';

const mammothMock = mammoth as jest.Mocked<typeof mammoth>;
const WordExtractorMock = WordExtractor as jest.MockedClass<typeof WordExtractor>;
const readPdfDocumentTextMock = readPdfDocumentText as jest.MockedFunction<typeof readPdfDocumentText>;

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

  it('extracts .pdf text via readPdfDocumentText', async () => {
    readPdfDocumentTextMock.mockResolvedValue({ text: 'Slide deck content', method: 'text' });

    const result = await getDocumentTextLines('/tmp/slides.pdf', 'pdf');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.lines).toEqual(['Slide deck content']);
      expect(result.kind).toBe('pdf');
      expect(result.via).toBe('text');
    }
    expect(readPdfDocumentTextMock).toHaveBeenCalledWith('/tmp/slides.pdf');
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
