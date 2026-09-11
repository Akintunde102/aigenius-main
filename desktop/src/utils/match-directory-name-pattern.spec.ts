import {
  globToDirectoryNameRegExp,
  matchesDirectoryNamePattern,
  compileDirectoryNamePattern,
  DIRECTORY_NAME_PATTERN_MAX_LENGTH,
} from './match-directory-name-pattern';

describe('matchesDirectoryNamePattern', () => {
  it('matches all names when pattern is omitted, empty, or whitespace', () => {
    expect(matchesDirectoryNamePattern('Cover_Aluko.pdf', undefined)).toBe(true);
    expect(matchesDirectoryNamePattern('Cover_Aluko.pdf', null)).toBe(true);
    expect(matchesDirectoryNamePattern('Cover_Aluko.pdf', '')).toBe(true);
    expect(matchesDirectoryNamePattern('Cover_Aluko.pdf', '   ')).toBe(true);
  });

  it('treats non-string patterns as no filter', () => {
    expect(matchesDirectoryNamePattern('a.txt', 1 as unknown as string)).toBe(true);
  });

  it('matches *Aluko* against a cover-letter filename (Aluko case)', () => {
    expect(matchesDirectoryNamePattern('Cover_Aluko_Oyebode.pdf', '*Aluko*')).toBe(true);
    expect(matchesDirectoryNamePattern('Cover_Aluko_Oyebode.docx', '*Aluko*')).toBe(true);
    expect(matchesDirectoryNamePattern('Cover_Kenna_Partners.pdf', '*Aluko*')).toBe(false);
  });

  it('is case-insensitive so *aluko* finds Cover_Aluko_Oyebode.pdf', () => {
    expect(matchesDirectoryNamePattern('Cover_Aluko_Oyebode.pdf', '*aluko*')).toBe(true);
    expect(matchesDirectoryNamePattern('COVER_ALUKO.pdf', '*Aluko*')).toBe(true);
  });

  it('matches a prefix glob', () => {
    expect(matchesDirectoryNamePattern('Cover_Aluko_Oyebode.pdf', 'Cover_*')).toBe(true);
    expect(matchesDirectoryNamePattern('Damilola_Olubaju_CV.pdf', 'Cover_*')).toBe(false);
  });

  it('matches a suffix glob for extensions', () => {
    expect(matchesDirectoryNamePattern('Cover_Aluko_Oyebode.pdf', '*.pdf')).toBe(true);
    expect(matchesDirectoryNamePattern('Cover_Aluko_Oyebode.docx', '*.pdf')).toBe(false);
    expect(matchesDirectoryNamePattern('readme', '*.pdf')).toBe(false);
  });

  it('matches a single-character ? wildcard', () => {
    expect(matchesDirectoryNamePattern('a1.txt', 'a?.txt')).toBe(true);
    expect(matchesDirectoryNamePattern('ab.txt', 'a?.txt')).toBe(true);
    expect(matchesDirectoryNamePattern('a12.txt', 'a?.txt')).toBe(false);
    expect(matchesDirectoryNamePattern('a.txt', 'a?.txt')).toBe(false);
  });

  it('matches an exact name with no wildcards', () => {
    expect(matchesDirectoryNamePattern('Cover_Aluko_Oyebode.pdf', 'Cover_Aluko_Oyebode.pdf')).toBe(true);
    expect(matchesDirectoryNamePattern('Cover_Aluko_Oyebode.pdf', 'Cover_Aluko.pdf')).toBe(false);
  });

  it('treats regex metacharacters other than glob tokens as literals', () => {
    expect(matchesDirectoryNamePattern('report (final).pdf', 'report (final).pdf')).toBe(true);
    expect(matchesDirectoryNamePattern('cost$2026.txt', 'cost$2026.txt')).toBe(true);
    expect(matchesDirectoryNamePattern('a+b.ts', 'a+b.ts')).toBe(true);
  });

  it('treats [N-Z] as a glob character class so Cover_[N-Z]* matches', () => {
    expect(matchesDirectoryNamePattern('Cover_Ngo.pdf', 'Cover_[N-Z]*')).toBe(true);
    expect(matchesDirectoryNamePattern('Cover_Aluko.pdf', 'Cover_[N-Z]*')).toBe(false);
    expect(matchesDirectoryNamePattern('Cover_Zed.pdf', 'Cover_[N-Z]*')).toBe(true);
    expect(matchesDirectoryNamePattern('Cover_n_lower.pdf', 'Cover_[N-Z]*')).toBe(true);
  });

  it('treats a closed [1] class as one character, not literal brackets', () => {
    expect(matchesDirectoryNamePattern('file1.txt', 'file[1].txt')).toBe(true);
    expect(matchesDirectoryNamePattern('file[1].txt', 'file[1].txt')).toBe(false);
  });

  it('treats a leading ^ as a literal glob character, not an anchored regex', () => {
    expect(matchesDirectoryNamePattern('Cover_Ngo.pdf', '^Cover_[N-Z]')).toBe(false);
    expect(matchesDirectoryNamePattern('^Cover_Ngo.pdf', '^Cover_[N-Z]*')).toBe(true);
  });

  it('does not compile slash-delimited regex as a name filter', () => {
    expect(matchesDirectoryNamePattern('Cover_Aluko.pdf', '/Aluko|Kenna/i')).toBe(false);
    expect(matchesDirectoryNamePattern('Cover_Kenna.pdf', '/Aluko|Kenna/')).toBe(false);
    expect(matchesDirectoryNamePattern('Aluko|Kenna', 'Aluko|Kenna')).toBe(true);
  });

  it('fails closed on overlong patterns', () => {
    const overlong = `${'a'.repeat(DIRECTORY_NAME_PATTERN_MAX_LENGTH + 1)}*`;
    expect(compileDirectoryNamePattern(overlong).kind).toBe('none');
    expect(matchesDirectoryNamePattern('a.txt', overlong)).toBe(false);
  });

  it('treats nested-quantifier regex as a literal glob so matching stays bounded', () => {
    const started = Date.now();
    expect(matchesDirectoryNamePattern('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaab', '(a+)+$')).toBe(false);
    expect(Date.now() - started).toBeLessThan(50);
  });

  it('uses only the last path segment when the pattern looks like a path glob', () => {
    expect(matchesDirectoryNamePattern('Cover_Aluko_Oyebode.pdf', '**/*Aluko*')).toBe(true);
    expect(matchesDirectoryNamePattern('Cover_Aluko_Oyebode.pdf', 'cover_letters/*Aluko*')).toBe(true);
    expect(matchesDirectoryNamePattern('Cover_Aluko_Oyebode.pdf', 'C:\\letters\\*Aluko*')).toBe(true);
    expect(matchesDirectoryNamePattern('Cover_Kenna.pdf', '**/*Aluko*')).toBe(false);
  });

  it('treats a slash-only pattern as no filter', () => {
    expect(matchesDirectoryNamePattern('anything.txt', '///')).toBe(true);
    expect(matchesDirectoryNamePattern('anything.txt', '\\\\')).toBe(true);
  });

  it('matches unicode names', () => {
    expect(matchesDirectoryNamePattern('Bewerbung_Übung.pdf', '*Übung*')).toBe(true);
    expect(matchesDirectoryNamePattern('Bewerbung_Übung.pdf', '*ubung*')).toBe(false);
  });

  it('matches names with spaces and dots', () => {
    expect(matchesDirectoryNamePattern('Dami CV.docx.pdf', '*CV*')).toBe(true);
    expect(matchesDirectoryNamePattern('Dami CV.docx.pdf', '*.pdf')).toBe(true);
    expect(matchesDirectoryNamePattern('.hidden', '.*')).toBe(true);
    expect(matchesDirectoryNamePattern('visible.txt', '.*')).toBe(false);
  });

  it('does not substring-match without wildcards', () => {
    expect(matchesDirectoryNamePattern('Cover_Aluko_Oyebode.pdf', 'Aluko')).toBe(false);
  });

  it('matches * against every non-empty name', () => {
    expect(matchesDirectoryNamePattern('a', '*')).toBe(true);
    expect(matchesDirectoryNamePattern('Cover_Aluko_Oyebode.pdf', '*')).toBe(true);
  });
});

describe('globToDirectoryNameRegExp', () => {
  it('returns null for empty or slash-only patterns', () => {
    expect(globToDirectoryNameRegExp('')).toBeNull();
    expect(globToDirectoryNameRegExp('   ')).toBeNull();
    expect(globToDirectoryNameRegExp('///')).toBeNull();
  });

  it('anchors the regex so *Aluko* does not match a longer unrelated suffix-only test via partial compile', () => {
    const re = globToDirectoryNameRegExp('*Aluko*');
    expect(re).toBeInstanceOf(RegExp);
    expect(re?.test('Cover_Aluko_Oyebode.pdf')).toBe(true);
    expect(re?.test('Aluko')).toBe(true);
    expect(re?.test('xAlukoy')).toBe(true);
    expect(re?.test('Kenna')).toBe(false);
  });
});
