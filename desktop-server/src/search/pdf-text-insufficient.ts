/** Heuristic: pdf-parse often returns empty or tiny strings for scanned PDFs. */
export function pdfTextLooksInsufficient(text: string, numPages: number): boolean {
  const trimmed = text.trim();
  if (!trimmed) return true;

  const pages = Math.max(1, numPages);
  const charsPerPage = trimmed.length / pages;

  if (trimmed.length < 40) return true;
  if (pages > 1 && charsPerPage < 25) return true;

  return false;
}
