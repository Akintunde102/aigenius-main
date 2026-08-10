import { spawn } from 'child_process';
import {
  buildRipgrepArgv,
  normalizeGrepArgs,
  runGrep,
} from './local-grep';

jest.mock('child_process', () => ({
  spawn: jest.fn(),
}));

const spawnMock = spawn as jest.Mock;

function mockRipgrep(stdout: string): string[][] {
  const captured: string[][] = [];
  spawnMock.mockImplementation((_cmd: string, args: string[]) => {
    captured.push(args);
    const proc = {
      stdout: { on: jest.fn((_event: string, cb: (buf: Buffer) => void) => cb(Buffer.from(stdout))) },
      stderr: { on: jest.fn() },
      on: jest.fn((event: string, cb: () => void) => {
        if (event === 'close') cb();
      }),
      kill: jest.fn(),
    };
    return proc;
  });
  return captured;
}

describe('local-grep', () => {
  beforeEach(() => {
    spawnMock.mockReset();
  });

  describe('normalizeGrepArgs', () => {
    it('requires path', () => {
      const out = normalizeGrepArgs({ pattern: 'foo' });
      expect(out.ok).toBe(false);
      if (!out.ok) expect(out.error).toContain('path is required');
    });

    it('accepts path_prefix alias', () => {
      const out = normalizeGrepArgs({ pattern: 'foo', path_prefix: '/tmp/proj' });
      expect(out.ok).toBe(true);
      if (out.ok) expect(out.args.path).toMatch(/proj$/);
    });

    it('rejects files_with_matches without glob or pattern', () => {
      const out = normalizeGrepArgs({
        path: '/tmp',
        output_mode: 'files_with_matches',
      });
      expect(out.ok).toBe(false);
      if (!out.ok) expect(out.error).toContain('glob is required');
    });

    it('maps legacy search_filenames + extensions to file list mode', () => {
      const out = normalizeGrepArgs({
        path_prefix: '/tmp/pics',
        search_filenames: true,
        extensions: ['png', 'jpg', 'jpeg'],
      });
      expect(out.ok).toBe(true);
      if (out.ok) {
        expect(out.args.outputMode).toBe('files_with_matches');
        expect(out.args.globs).toEqual(['**/*.{png,jpg,jpeg}']);
        expect(out.args.pattern).toBe('');
      }
    });
  });

  describe('buildRipgrepArgv', () => {
    it('lists image files with --files and glob', () => {
      const argv = buildRipgrepArgv({
        pattern: '',
        path: 'C:\\Pictures',
        outputMode: 'files_with_matches',
        globs: ['**/*.{png,jpg,jpeg}'],
        headLimit: 50,
        offset: 0,
        caseInsensitive: false,
        multiline: false,
      });
      expect(argv).toEqual([
        '--files',
        '--color=never',
        '-g',
        '**/*.{png,jpg,jpeg}',
        'C:\\Pictures',
      ]);
    });

    it('searches code with default glob when none provided', () => {
      const argv = buildRipgrepArgv({
        pattern: 'export function',
        path: '/proj',
        outputMode: 'content',
        globs: [],
        headLimit: 50,
        offset: 0,
        caseInsensitive: false,
        multiline: false,
      });
      expect(argv).toContain('-g');
      expect(argv).toContain('*.{ts,tsx,js,jsx,py,go,rs,md}');
      expect(argv).toContain('export function');
      expect(argv).not.toContain('-w');
    });

    it('uses -l for files_with_matches with pattern', () => {
      const argv = buildRipgrepArgv({
        pattern: 'TODO',
        path: '/proj',
        outputMode: 'files_with_matches',
        globs: ['**/*.ts'],
        headLimit: 50,
        offset: 0,
        caseInsensitive: true,
        multiline: false,
      });
      expect(argv[0]).toBe('-l');
      expect(argv).toContain('-i');
      expect(argv).toContain('TODO');
    });
  });

  describe('runGrep', () => {
    it('lists png files under a directory without listing all files', async () => {
      const captured = mockRipgrep(
        'C:\\Pictures\\akintunde.png\nC:\\Pictures\\shot.jpg\n',
      );
      const out = await runGrep({
        path: 'C:\\Pictures',
        glob: '**/*.{png,jpg,jpeg}',
        output_mode: 'files_with_matches',
      });
      expect(out.ok).toBe(true);
      if (out.ok) {
        expect(out.result).toContain('# Files matching');
        expect(out.result).toContain('akintunde.png');
        expect(captured[0]).toContain('--files');
        expect(captured[0]).toContain('**/*.{png,jpg,jpeg}');
        expect(captured[0]?.includes('--files')).toBe(true);
      }
    });

    it('returns content matches with line numbers', async () => {
      mockRipgrep('src/util.ts:12:export function helper');
      const out = await runGrep({
        pattern: 'helper',
        path: '/proj',
        glob: '**/*.ts',
      });
      expect(out.ok).toBe(true);
      if (out.ok) {
        expect(out.result).toContain('# Grep: helper');
        expect(out.result).toContain('src/util.ts:12:export function helper');
      }
    });

    it('does not list every file when jpeg is in glob brace expansion', async () => {
      const captured = mockRipgrep('C:\\Pictures\\photo.jpeg\n');
      const out = await runGrep({
        path: 'C:\\Pictures',
        glob: '**/*.{png,jpg,jpeg,webp}',
        output_mode: 'files_with_matches',
      });
      expect(out.ok).toBe(true);
      expect(captured[0]).toEqual([
        '--files',
        '--color=never',
        '-g',
        '**/*.{png,jpg,jpeg,webp}',
        'C:\\Pictures',
      ]);
    });
  });
});
