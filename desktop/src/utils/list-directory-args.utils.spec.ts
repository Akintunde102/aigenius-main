import {
  LIST_DIRECTORY_DEFAULT_LIMIT,
  LIST_DIRECTORY_MAX_LIMIT,
  filePassesExtensionFilter,
  parseListDirectoryExtensions,
  parseListDirectoryLimit,
  parseListDirectoryPattern,
  parseListDirectoryToolArgs,
} from './list-directory-args.utils';

describe('parseListDirectoryLimit', () => {
  it('defaults when limit is missing or not a finite number', () => {
    expect(parseListDirectoryLimit(undefined)).toBe(LIST_DIRECTORY_DEFAULT_LIMIT);
    expect(parseListDirectoryLimit(null)).toBe(LIST_DIRECTORY_DEFAULT_LIMIT);
    expect(parseListDirectoryLimit('50')).toBe(LIST_DIRECTORY_DEFAULT_LIMIT);
    expect(parseListDirectoryLimit(Number.NaN)).toBe(LIST_DIRECTORY_DEFAULT_LIMIT);
    expect(parseListDirectoryLimit(Number.POSITIVE_INFINITY)).toBe(LIST_DIRECTORY_DEFAULT_LIMIT);
  });

  it('clamps zero and negatives up to 1', () => {
    expect(parseListDirectoryLimit(0)).toBe(1);
    expect(parseListDirectoryLimit(-4)).toBe(1);
  });

  it('clamps values above the max down to 1000', () => {
    expect(parseListDirectoryLimit(5000)).toBe(LIST_DIRECTORY_MAX_LIMIT);
  });

  it('floors fractional limits', () => {
    expect(parseListDirectoryLimit(12.9)).toBe(12);
  });

  it('accepts a value inside the range', () => {
    expect(parseListDirectoryLimit(50)).toBe(50);
  });
});

describe('parseListDirectoryExtensions', () => {
  it('returns null for missing, non-array, or empty input', () => {
    expect(parseListDirectoryExtensions(undefined)).toBeNull();
    expect(parseListDirectoryExtensions('pdf')).toBeNull();
    expect(parseListDirectoryExtensions([])).toBeNull();
  });

  it('normalizes dots and case and drops blank tokens', () => {
    expect(parseListDirectoryExtensions(['.PDF', 'Docx', ' ', 1, null])).toEqual(['pdf', 'docx']);
  });

  it('returns null when every token is unusable', () => {
    expect(parseListDirectoryExtensions(['', '.', 12])).toBeNull();
  });
});

describe('parseListDirectoryPattern', () => {
  it('trims strings and returns empty for non-strings', () => {
    expect(parseListDirectoryPattern('  *Aluko*  ')).toBe('*Aluko*');
    expect(parseListDirectoryPattern(12)).toBe('');
    expect(parseListDirectoryPattern(undefined)).toBe('');
  });
});

describe('filePassesExtensionFilter', () => {
  it('allows every file when extensions is null or empty', () => {
    expect(filePassesExtensionFilter('a.pdf', null)).toBe(true);
    expect(filePassesExtensionFilter('a.pdf', [])).toBe(true);
  });

  it('matches the last extension only', () => {
    expect(filePassesExtensionFilter('Cover_Aluko.pdf', ['pdf'])).toBe(true);
    expect(filePassesExtensionFilter('Cover_Aluko.PDF', ['pdf'])).toBe(true);
    expect(filePassesExtensionFilter('Cover_Aluko.docx', ['pdf'])).toBe(false);
    expect(filePassesExtensionFilter('archive.tar.gz', ['gz'])).toBe(true);
    expect(filePassesExtensionFilter('archive.tar.gz', ['tar'])).toBe(false);
  });

  it('rejects extensionless names when a filter is set', () => {
    expect(filePassesExtensionFilter('Makefile', ['pdf'])).toBe(false);
    expect(filePassesExtensionFilter('.gitignore', ['gitignore'])).toBe(false);
  });
});

describe('parseListDirectoryToolArgs', () => {
  it('applies defaults for a path-only call', () => {
    expect(parseListDirectoryToolArgs({})).toEqual({
      recursive: false,
      pattern: '',
      extensions: null,
      limit: LIST_DIRECTORY_DEFAULT_LIMIT,
      summaryOnly: false,
    });
  });

  it('parses the Aluko-style filter call', () => {
    expect(
      parseListDirectoryToolArgs({
        pattern: '*Aluko*',
        extensions: ['pdf', 'docx'],
        recursive: true,
        limit: 50,
      }),
    ).toEqual({
      recursive: true,
      pattern: '*Aluko*',
      extensions: ['pdf', 'docx'],
      limit: 50,
      summaryOnly: false,
    });
  });

  it('does not parse a leftover command key', () => {
    expect(
      parseListDirectoryToolArgs({
        command: '  Get-ChildItem -Filter *Aluko* | Select-Object FullName  ',
      }),
    ).toEqual({
      recursive: false,
      pattern: '',
      extensions: null,
      limit: LIST_DIRECTORY_DEFAULT_LIMIT,
      summaryOnly: false,
    });
  });

  it('treats recursive as true only for boolean true', () => {
    expect(parseListDirectoryToolArgs({ recursive: 'true' }).recursive).toBe(false);
    expect(parseListDirectoryToolArgs({ recursive: 1 }).recursive).toBe(false);
    expect(parseListDirectoryToolArgs({ recursive: true }).recursive).toBe(true);
  });

  it('treats summary_only as true only for boolean true', () => {
    expect(parseListDirectoryToolArgs({ summary_only: true }).summaryOnly).toBe(true);
    expect(parseListDirectoryToolArgs({ summary_only: 'true' }).summaryOnly).toBe(false);
  });
});
