import { pdfTextLooksInsufficient } from './pdf-text-insufficient.js';

describe('pdfTextLooksInsufficient', () => {
  it('treats empty text as insufficient', () => {
    expect(pdfTextLooksInsufficient('', 3)).toBe(true);
    expect(pdfTextLooksInsufficient('   ', 1)).toBe(true);
  });

  it('treats very short text as insufficient', () => {
    expect(pdfTextLooksInsufficient('short', 1)).toBe(true);
  });

  it('treats multi-page PDFs with sparse text as insufficient', () => {
    expect(pdfTextLooksInsufficient('a'.repeat(30), 5)).toBe(true);
  });

  it('accepts healthy embedded text', () => {
    const text = 'This is a normal paragraph of embedded PDF text with enough content.';
    expect(pdfTextLooksInsufficient(text, 1)).toBe(false);
    expect(pdfTextLooksInsufficient(`${text}\n${text}`, 2)).toBe(false);
  });
});
