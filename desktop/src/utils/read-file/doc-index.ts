import fs from 'fs/promises';
import path from 'path';

export type DocSection = {
  id: number;
  title: string;
  line_start: number;
  line_end: number;
};

const DOC_EXTENSIONS = new Set(['.md', '.txt', '.markdown']);

export function isDocIndexCandidate(filePath: string): boolean {
  return DOC_EXTENSIONS.has(path.extname(filePath).toLowerCase());
}

const DOC_INDEX_AUTO_THRESHOLD_LINES = 500;

export function shouldAutoDocIndex(totalLines: number, mode: string | undefined): boolean {
  if (mode === 'index') return true;
  if (mode === 'lines') return false;
  return totalLines >= DOC_INDEX_AUTO_THRESHOLD_LINES;
}

/**
 * Scan markdown/text headings (ATX + setext), skipping fenced code blocks.
 */
export async function buildDocSectionIndex(filePath: string): Promise<DocSection[]> {
  const raw = await fs.readFile(filePath, 'utf8');
  const lines = raw.split(/\r?\n/);
  const sections: Array<{ title: string; line_start: number }> = [];
  let inFence = false;

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const trimmed = line.trim();

    if (/^```/.test(trimmed)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;

    const atx = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (atx) {
      sections.push({ title: atx[2].trim(), line_start: i + 1 });
      continue;
    }

    if (i + 1 < lines.length) {
      const next = lines[i + 1].trim();
      if (/^=+$/.test(next) && trimmed.length > 0) {
        sections.push({ title: trimmed, line_start: i + 1 });
        continue;
      }
      if (/^-+$/.test(next) && trimmed.length > 0) {
        sections.push({ title: trimmed, line_start: i + 1 });
      }
    }
  }

  if (sections.length === 0) {
    return [{ id: 1, title: '(document)', line_start: 1, line_end: lines.length }];
  }

  return sections.map((s, idx) => {
    const nextStart = sections[idx + 1]?.line_start;
    const line_end = nextStart ? nextStart - 1 : lines.length;
    return { id: idx + 1, title: s.title, line_start: s.line_start, line_end };
  });
}

export function formatDocIndex(sections: DocSection[]): string {
  const lines = sections.map(
    (s) => `${s.id}. **${s.title}** (lines ${s.line_start}–${s.line_end}) — use anchorSymbol: "section:${s.id}"`,
  );
  return lines.join('\n');
}

export function resolveDocSection(sections: DocSection[], anchor: string): DocSection | null {
  const m = anchor.match(/^section:(\d+)$/i);
  if (!m) return null;
  const id = Number(m[1]);
  return sections.find((s) => s.id === id) ?? null;
}
