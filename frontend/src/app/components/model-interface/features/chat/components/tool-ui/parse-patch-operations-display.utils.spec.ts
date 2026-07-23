import {
  parsePatchOperationsForDisplay,
  proposedBodyAsUnifiedDiffLines,
  summarizePatchOperations,
} from './parse-patch-operations-display.utils';

describe('parsePatchOperationsForDisplay', () => {
  it('returns error when operations missing', () => {
    const r = parsePatchOperationsForDisplay({});
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.userMessage).toMatch(/missing/i);
  });

  it('parses create, update, delete', () => {
    const r = parsePatchOperationsForDisplay({
      operations: [
        { op: 'create_file', path: '/home/x/a.txt', content: 'hello' },
        { operation: 'update', path: '/home/x/b.txt', content: 'x' },
        { type: 'delete_file', path: '/home/x/c.txt' },
      ],
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.operations[0]).toMatchObject({ kind: 'create_file', path: '/home/x/a.txt', content: 'hello' });
    expect(r.operations[1]).toMatchObject({ kind: 'update_file', path: '/home/x/b.txt' });
    expect(r.operations[2]).toMatchObject({ kind: 'delete_file', path: '/home/x/c.txt' });
  });

  it('normalizes escaped newlines in content', () => {
    const r = parsePatchOperationsForDisplay({
      operations: [{ op: 'create_file', path: '/home/x/a.ts', content: 'import x\\n\\nexport const y = 1;' }],
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.operations[0]).toMatchObject({
      kind: 'create_file',
      content: 'import x\n\nexport const y = 1;',
    });
  });

  it('parses apply_hunk search and replace', () => {
    const r = parsePatchOperationsForDisplay({
      operations: [
        {
          op: 'apply_hunk',
          path: '/home/x/a.ts',
          search: 'path: displayPath,',
          replace: 'path: displayPath,\\n  resolvedPath: resolved,',
        },
      ],
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.operations[0]).toMatchObject({
      kind: 'apply_hunk',
      search: 'path: displayPath,',
      replace: 'path: displayPath,\n  resolvedPath: resolved,',
    });
  });

  it('records invalid operations', () => {
    const r = parsePatchOperationsForDisplay({
      operations: [{ op: 'nope', path: '/home/x/a.txt' }],
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.operations[0].kind).toBe('invalid');
  });
});

describe('summarizePatchOperations', () => {
  it('aggregates kinds', () => {
    const s = summarizePatchOperations([
      { kind: 'create_file', path: '/a', content: '' },
      { kind: 'delete_file', path: '/b' },
      { kind: 'invalid', path: null, detail: 'x' },
    ]);
    expect(s).toContain('1 create');
    expect(s).toContain('1 delete');
    expect(s).toContain('1 invalid');
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
