import { pdfTextLooksInsufficient } from './pdf-text-insufficient.js';

describe('pdfTextLooksInsufficient — realistic scenarios', () => {
  it('flags empty invoice scans', () => {
    expect(pdfTextLooksInsufficient('', 1)).toBe(true);
    expect(pdfTextLooksInsufficient('   \n  ', 3)).toBe(true);
  });

  it('flags 12-page deck with only page numbers in text layer', () => {
    expect(pdfTextLooksInsufficient('1\n2\n3\n4\n5\n6\n7\n8\n9\n10\n11\n12', 12)).toBe(true);
  });

  it('accepts a real contract excerpt', () => {
    const text = [
      'SERVICE AGREEMENT',
      'This agreement is entered into between Party A and Party B.',
      'Term: twelve (12) months from the effective date.',
      'Payment: net 30 from invoice date.',
    ].join('\n');
    expect(pdfTextLooksInsufficient(text, 4)).toBe(false);
  });

  it('accepts borderline single-page memo above threshold', () => {
    const text = 'Meeting notes: deploy window Saturday 02:00 UTC.';
    expect(pdfTextLooksInsufficient(text, 1)).toBe(false);
  });
});

describe('readPdfText — integration scenarios (no OCR)', () => {
  it('is covered by scripts/run-pdf-integration.mts (pdf.js is ESM-only; Jest cannot load it)', () => {
    expect(true).toBe(true);
  });
});
