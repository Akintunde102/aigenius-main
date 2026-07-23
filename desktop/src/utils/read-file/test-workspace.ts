import fs from 'fs/promises';
import os from 'os';
import path from 'path';

/** Create a temp workspace with optional files. Returns root path. */
export async function createTestWorkspace(
  files: Record<string, string> = {},
): Promise<string> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'read-file-ws-'));
  for (const [rel, content] of Object.entries(files)) {
    const full = path.join(root, rel);
    await fs.mkdir(path.dirname(full), { recursive: true });
    await fs.writeFile(full, content, 'utf8');
  }
  return root;
}

/** Write a file with N numbered lines (1-indexed labels). */
export function numberedLines(count: number, label = 'LINE'): string {
  return Array.from({ length: count }, (_, i) => `${label}_${i + 1}`).join('\n');
}

/** Extract next start_line from our truncation notice (mimics LLM parsing tool output). */
export function parseNextStartLine(content: string): number | null {
  const start = content.match(/start_line=(\d+)/);
  if (start) return Number(start[1]);
  const off = content.match(/offset=(\d+)/);
  if (off) return Number(off[1]) + 1;
  return null;
}

/** Collect 1-based line numbers from cat -n formatted content. */
export function extractLineNumbers(content: string): number[] {
  const nums: number[] = [];
  for (const line of content.split('\n')) {
    const m = line.match(/^\s*(\d+)\t/);
    if (m) nums.push(Number(m[1]));
  }
  return nums;
}

/** Simulate an agent paginating until EOF or max pages. */
export async function simulateAgentFullRead(
  readPage: (startLine: number) => Promise<{ content: string; status: string; truncated?: boolean }>,
  maxPages = 50,
): Promise<{ pages: string[]; allLineNums: number[] }> {
  const pages: string[] = [];
  const allLineNums: number[] = [];
  let startLine = 1;

  for (let p = 0; p < maxPages; p += 1) {
    const page = await readPage(startLine);
    pages.push(page.content);
    allLineNums.push(...extractLineNumbers(page.content));

    if (page.status !== 'truncated' && !page.content.includes('> ⚠')) {
      break;
    }
    const next = parseNextStartLine(page.content);
    if (!next || next <= startLine) break;
    startLine = next;
  }

  return { pages, allLineNums };
}
