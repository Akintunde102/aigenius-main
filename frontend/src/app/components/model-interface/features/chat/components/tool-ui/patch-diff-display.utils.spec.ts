import {
  buildContentDiffLines,
  buildHunkDiffLines,
  classifyDiffLine,
  countDiffDisplayStats,
  countUnifiedDiffStats,
  fileExtensionLabel,
  fileNameFromPath,
  normalizePatchContent,
  proposedBodyAsUnifiedDiffLines,
  sliceDiffWindow,
  splitPatchContent,
} from './patch-diff-display.utils';

describe('classifyDiffLine', () => {
  it('classifies unified diff prefixes', () => {
    expect(classifyDiffLine('--- a')).toBe('header');
    expect(classifyDiffLine('+++ b')).toBe('header');
    expect(classifyDiffLine('@@ -1 +1 @@')).toBe('hunk');
    expect(classifyDiffLine('+x')).toBe('add');
    expect(classifyDiffLine('-y')).toBe('remove');
    expect(classifyDiffLine(' context')).toBe('context');
  });
});

describe('countUnifiedDiffStats', () => {
  it('counts add/remove lines', () => {
    expect(countUnifiedDiffStats(['--- a', '+++ b', '+one', '+two', '-old'])).toEqual({
      additions: 2,
      deletions: 1,
    });
  });
});

describe('normalizePatchContent', () => {
  it('converts escaped newlines to real line breaks', () => {
    expect(normalizePatchContent('import x\\n\\nexport const y = 1;')).toBe('import x\n\nexport const y = 1;');
  });
});

describe('splitPatchContent', () => {
  it('splits normalized content into lines', () => {
    expect(splitPatchContent('a\\nb')).toEqual(['a', 'b']);
  });
});

describe('buildContentDiffLines', () => {
  it('assigns line numbers and marks additions', () => {
    const lines = buildContentDiffLines('line one\\nline two');
    expect(lines).toHaveLength(2);
    expect(lines[0]).toMatchObject({ lineNumber: 1, prefix: '+', text: 'line one', kind: 'add' });
    expect(lines[1]).toMatchObject({ lineNumber: 2, prefix: '+', text: 'line two', kind: 'add' });
  });
});

describe('buildHunkDiffLines', () => {
  it('shows shared context and changed lines', () => {
    const lines = buildHunkDiffLines('path: displayPath,', 'path: displayPath,\n  resolvedPath: resolved,');
    expect(lines.some((l) => l.kind === 'context' && l.text === 'path: displayPath,')).toBe(true);
    expect(lines.some((l) => l.kind === 'add' && l.text === '  resolvedPath: resolved,')).toBe(true);
    expect(lines[0].lineNumber).toBe(1);
  });
});

describe('countDiffDisplayStats', () => {
  it('counts display line kinds', () => {
    expect(
      countDiffDisplayStats([
        { lineNumber: 1, prefix: '+', text: 'a', kind: 'add' },
        { lineNumber: 2, prefix: '-', text: 'b', kind: 'remove' },
      ]),
    ).toEqual({ additions: 1, deletions: 1 });
  });
});

describe('sliceDiffWindow', () => {
  it('reveals more lines when expanded', () => {
    const lines = buildContentDiffLines(Array.from({ length: 20 }, (_, i) => `line ${i + 1}`).join('\n'));
    const initial = sliceDiffWindow(lines, 0, 0, 8);
    expect(initial.visible).toHaveLength(8);
    expect(initial.hiddenBelow).toBe(12);

    const expanded = sliceDiffWindow(lines, 0, 12, 8);
    expect(expanded.visible).toHaveLength(20);
    expect(expanded.hiddenBelow).toBe(0);
  });
});

describe('fileNameFromPath', () => {
  it('returns basename', () => {
    expect(fileNameFromPath('src/utils/index.ts')).toBe('index.ts');
    expect(fileNameFromPath('C:\\proj\\search.routes.ts')).toBe('search.routes.ts');
  });
});

describe('fileExtensionLabel', () => {
  it('returns uppercase extension badge text', () => {
    expect(fileExtensionLabel('src/a.ts')).toBe('TS');
    expect(fileExtensionLabel('README')).toBe('FILE');
  });
});

describe('proposedBodyAsUnifiedDiffLines', () => {
  it('prefixes lines with +', () => {
    const lines = proposedBodyAsUnifiedDiffLines('src/a.ts', 'a\nb');
    expect(lines[0]).toBe('--- /dev/null');
    expect(lines[1]).toBe('+++ src/a.ts');
    expect(lines[2]).toBe('+a');
    expect(lines[3]).toBe('+b');
  });
});
