import fs from 'fs/promises';
import path from 'path';
import { executeReadFile } from './read-file-service';
import {
  createTestWorkspace,
  numberedLines,
  parseNextStartLine,
  simulateAgentFullRead,
  extractLineNumbers,
} from './test-workspace';
import { formatReadFileBatch } from '../tool-formatter';

let workspaceRoot = '';

jest.mock('../../sidecar-fetch', () => ({
  sidecarFetch: jest.fn().mockResolvedValue({ ok: false, json: async () => ({}), text: async () => '' }),
}));

jest.mock('../../active-code-project', () => ({
  getActiveCodeProjectRootPath: () => workspaceRoot,
  getActiveCodeProjectId: () => 'test-project',
  setActiveCodeProjectIndex: jest.fn(),
}));

describe('read-file-service integration', () => {
  afterEach(async () => {
    if (workspaceRoot) {
      await fs.rm(workspaceRoot, { recursive: true, force: true });
      workspaceRoot = '';
    }
  });

  it('returns error when no path provided (LLM empty tool call)', async () => {
    workspaceRoot = await createTestWorkspace();
    const batch = await executeReadFile({});
    expect(batch.results[0].status).toBe('error');
    expect(batch.results[0].content).toContain('path is required');
  });

  it('reads relative path with line numbers', async () => {
    workspaceRoot = await createTestWorkspace({ 'src/main.ts': 'const x = 1;\nconst y = 2;\n' });
    const batch = await executeReadFile({ path: 'src/main.ts', max_lines: 10 });
    expect(batch.results[0].status).toBe('ok');
    expect(batch.results[0].content).toContain('\tconst x = 1;');
    expect(batch.results[0].totalLines).toBe(2);
  });

  it('supports 0-based offset/limit aliases (LLM Cursor-style)', async () => {
    workspaceRoot = await createTestWorkspace({ 'f.txt': numberedLines(5) });
    const batch = await executeReadFile({ path: 'f.txt', offset: 2, limit: 2 });
    const nums = extractLineNumbers(batch.results[0].content);
    expect(nums).toEqual([3, 4]);
  });

  it('rejects binary files with structured error', async () => {
    workspaceRoot = await createTestWorkspace();
    const binPath = path.join(workspaceRoot, 'data.bin');
    await fs.writeFile(binPath, Buffer.from([0, 1, 2, 0, 4]));
    const batch = await executeReadFile({ path: 'data.bin' });
    expect(batch.results[0].status).toBe('error');
    expect(batch.results[0].content).toContain('binary');
  });

  it('batch reads multiple files via reads[]', async () => {
    workspaceRoot = await createTestWorkspace({
      'a.ts': 'a\n',
      'b.ts': 'b\n',
    });
    const batch = await executeReadFile({
      reads: [{ path: 'a.ts' }, { path: 'b.ts' }],
      model_context_length: 200_000,
    });
    expect(batch.results).toHaveLength(2);
    expect(batch.results.every((r) => r.status === 'ok')).toBe(true);
    const formatted = formatReadFileBatch(batch);
    expect(formatted.result).toContain('Read files (2)');
  });

  it('caps batch file count by context tier (small model)', async () => {
    workspaceRoot = await createTestWorkspace({
      '1.ts': '1\n', '2.ts': '2\n', '3.ts': '3\n',
    });
    const batch = await executeReadFile({
      reads: [{ path: '1.ts' }, { path: '2.ts' }, { path: '3.ts' }],
      model_context_length: 16_000,
    });
    expect(batch.results.length).toBeGreaterThanOrEqual(3);
    const skipped = batch.results.find((r) => r.content.includes('batch limit'));
    expect(skipped).toBeDefined();
  });
});

describe('read-file LLM agent scenarios', () => {
  afterEach(async () => {
    if (workspaceRoot) {
      await fs.rm(workspaceRoot, { recursive: true, force: true });
      workspaceRoot = '';
    }
  });

  /**
   * Claude Code #28783: agent treats truncated prefix as complete file and misses guardrails.
   * Our contract: leading ⚠ banner + explicit start_line continuation hint.
   */
  it('guardrail file: truncation notice is leading, guardrail lines not shown', async () => {
    const lines: string[] = [];
    for (let i = 1; i <= 600; i += 1) {
      lines.push(i === 550 ? 'NEVER_DELETE_PRODUCTION=true' : `rule line ${i}`);
    }
    workspaceRoot = await createTestWorkspace({ '.cursorrules': lines.join('\n') });

    const batch = await executeReadFile({
      path: '.cursorrules',
      max_lines: 100,
      model_context_length: 200_000,
    });
    const { content, status, truncationNotice } = batch.results[0];

    expect(status).toBe('truncated');
    expect(content).not.toContain('NEVER_DELETE_PRODUCTION');
    expect(content.indexOf('> ⚠')).toBeLessThan(content.indexOf('\t'));
    expect(truncationNotice).toMatch(/start_line=101/);
    expect(content.startsWith('> ⚠')).toBe(true);
  });

  /**
   * DeepAgents #4540: agent uses remaining-line metadata to jump/read tail of large file.
   */
  it('agent can reach tail marker via pagination metadata', async () => {
    const body = numberedLines(301);
    const withTail = body.replace('LINE_301', 'TAIL_MARKER_XYZ');
    workspaceRoot = await createTestWorkspace({ 'big.log': withTail });

    const { pages, allLineNums } = await simulateAgentFullRead(async (startLine) => {
      const batch = await executeReadFile({
        path: 'big.log',
        start_line: startLine,
        max_lines: 100,
        model_context_length: 200_000,
      });
      const r = batch.results[0];
      return { content: r.content, status: r.status };
    });

    const fullText = pages.join('\n');
    expect(fullText).toContain('TAIL_MARKER_XYZ');
    expect(allLineNums).toContain(301);
    expect(pages.length).toBeGreaterThan(1);
  });

  /**
   * DeepAgents #2453: pagination must not skip source lines after long-line display truncation.
   */
  it('pagination does not skip lines when one line is very long', async () => {
    const longLine = 'X'.repeat(5_000);
    workspaceRoot = await createTestWorkspace({
      'wrap.ts': ['line1', longLine, 'line3', 'line4', 'line5'].join('\n'),
    });

    const page1 = await executeReadFile({
      path: 'wrap.ts',
      start_line: 1,
      max_lines: 2,
      model_context_length: 200_000,
    });
    const next = parseNextStartLine(page1.results[0].content);
    expect(next).toBe(3);

    const page2 = await executeReadFile({
      path: 'wrap.ts',
      start_line: next!,
      max_lines: 10,
      model_context_length: 200_000,
    });

    const nums = [
      ...extractLineNumbers(page1.results[0].content),
      ...extractLineNumbers(page2.results[0].content),
    ];
    expect(nums).toContain(1);
    expect(nums).toContain(3);
    expect(nums).toContain(4);
    expect(nums).toContain(5);
    expect(page1.results[0].content).toContain('[line truncated');
  });

  it('complete file read reports ok without truncation banner', async () => {
    workspaceRoot = await createTestWorkspace({ 'small.ts': 'only line\n' });
    const batch = await executeReadFile({ path: 'small.ts', model_context_length: 200_000 });
    expect(batch.results[0].status).toBe('ok');
    expect(batch.results[0].content).not.toContain('> ⚠');
  });

  it('offset beyond EOF returns empty content without false complete signal', async () => {
    workspaceRoot = await createTestWorkspace({ 'tiny.txt': 'a\nb\n' });
    const batch = await executeReadFile({
      path: 'tiny.txt',
      start_line: 100,
      max_lines: 50,
      model_context_length: 200_000,
    });
    expect(batch.results[0].status).toBe('ok');
    expect(batch.results[0].content.trim()).toBe('');
    expect(batch.results[0].content).not.toContain('> ⚠');
  });

  it('auto doc index for large markdown (LLM explores spec first)', async () => {
    const lines = ['# Spec', ''];
    for (let i = 0; i < 520; i += 1) lines.push(`paragraph ${i}`);
    workspaceRoot = await createTestWorkspace({ 'SPEC.md': lines.join('\n') });

    const batch = await executeReadFile({
      path: 'SPEC.md',
      model_context_length: 200_000,
    });
    expect(batch.results[0].resolvedVia).toBe('docIndex');
    expect(batch.results[0].content).toContain('section:');
    expect(batch.results[0].content).toContain('Large document');
  });

  it('symbol anchor fallback keeps agent unblocked (PRD §5.4)', async () => {
    workspaceRoot = await createTestWorkspace({
      'broken.ts': numberedLines(20),
    });
    const batch = await executeReadFile({
      path: 'broken.ts',
      anchorSymbol: 'NonExistentSymbol',
      model_context_length: 200_000,
    });
    expect(batch.results[0].resolvedVia).toBe('lineRangeFallback');
    expect(batch.results[0].content).toContain('did not resolve');
    expect(batch.results[0].status).not.toBe('error');
  });

  it('byte mode only when max_bytes set (legacy LLM calls)', async () => {
    workspaceRoot = await createTestWorkspace({ 'legacy.log': 'hello byte mode' });
    const batch = await executeReadFile({
      path: 'legacy.log',
      max_bytes: 1024,
      model_context_length: 200_000,
    });
    expect(batch.results[0].mode).toBe('bytes');
    expect(batch.results[0].content).toContain('hello byte mode');
  });
});
