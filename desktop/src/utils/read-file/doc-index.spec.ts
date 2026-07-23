import fs from 'fs/promises';
import path from 'path';
import {
  buildDocSectionIndex,
  formatDocIndex,
  isDocIndexCandidate,
  resolveDocSection,
  shouldAutoDocIndex,
} from './doc-index';
import { createTestWorkspace } from './test-workspace';

describe('doc-index', () => {
  let root = '';

  afterEach(async () => {
    if (root) await fs.rm(root, { recursive: true, force: true });
  });

  it('identifies markdown and text extensions', () => {
    expect(isDocIndexCandidate('README.md')).toBe(true);
    expect(isDocIndexCandidate('notes.txt')).toBe(true);
    expect(isDocIndexCandidate('code.ts')).toBe(false);
  });

  it('auto-indexes at 500+ lines in auto mode', () => {
    expect(shouldAutoDocIndex(499, 'auto')).toBe(false);
    expect(shouldAutoDocIndex(500, 'auto')).toBe(true);
    expect(shouldAutoDocIndex(1000, 'lines')).toBe(false);
    expect(shouldAutoDocIndex(10, 'index')).toBe(true);
  });

  it('ignores # headings inside fenced code blocks (false positive guard)', async () => {
    root = await createTestWorkspace({
      'docs/api.md': [
        '# Real Title',
        '',
        '```ts',
        '# not a heading',
        '```',
        '',
        '## Real Section',
        'body',
      ].join('\n'),
    });
    const file = path.join(root, 'docs', 'api.md');
    const sections = await buildDocSectionIndex(file);
    const titles = sections.map((s) => s.title);
    expect(titles).toContain('Real Title');
    expect(titles).toContain('Real Section');
    expect(titles).not.toContain('not a heading');
  });

  it('parses setext headings', async () => {
    root = await createTestWorkspace({
      'guide.txt': ['Title Here', '=========', '', 'Content'].join('\n'),
    });
    const sections = await buildDocSectionIndex(path.join(root, 'guide.txt'));
    expect(sections.some((s) => s.title === 'Title Here')).toBe(true);
  });

  it('formats index with section:N anchors for LLM follow-up reads', async () => {
    root = await createTestWorkspace({
      'spec.md': '# A\n\n## B\n\ncontent\n',
    });
    const sections = await buildDocSectionIndex(path.join(root, 'spec.md'));
    const index = formatDocIndex(sections);
    expect(index).toMatch(/section:1/);
    expect(index).toMatch(/anchorSymbol/);
    const sec = resolveDocSection(sections, 'section:1');
    expect(sec?.line_start).toBeGreaterThan(0);
  });

  it('returns single document section when no headings found', async () => {
    root = await createTestWorkspace({ 'plain.txt': 'no headings\njust text\n' });
    const sections = await buildDocSectionIndex(path.join(root, 'plain.txt'));
    expect(sections).toHaveLength(1);
    expect(sections[0].title).toBe('(document)');
  });
});
