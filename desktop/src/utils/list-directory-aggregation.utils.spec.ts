import {
  HIDDEN_CONFIG_GROUP,
  NO_EXTENSION_GROUP,
  classifyFileExtensionGroup,
  emptyDirectoryAggregation,
  formatExtensionCounts,
  incrementExtensionCount,
  inferAggregationFromItems,
} from './list-directory-aggregation.utils';

describe('classifyFileExtensionGroup', () => {
  it('lowercases extensions and keeps the leading dot', () => {
    expect(classifyFileExtensionGroup('Cover_Aluko.PDF')).toBe('.pdf');
    expect(classifyFileExtensionGroup('Cover_Aluko.docx')).toBe('.docx');
  });

  it('groups Makefile-style names under [no extension]', () => {
    expect(classifyFileExtensionGroup('Makefile')).toBe(NO_EXTENSION_GROUP);
    expect(classifyFileExtensionGroup('LICENSE')).toBe(NO_EXTENSION_GROUP);
  });

  it('groups dotfiles without a further extension as hidden/config', () => {
    expect(classifyFileExtensionGroup('.gitignore')).toBe(HIDDEN_CONFIG_GROUP);
    expect(classifyFileExtensionGroup('.env')).toBe(HIDDEN_CONFIG_GROUP);
  });

  it('uses the last suffix for multi-dot names', () => {
    expect(classifyFileExtensionGroup('archive.tar.gz')).toBe('.gz');
    expect(classifyFileExtensionGroup('.env.local')).toBe('.local');
  });
});

describe('formatExtensionCounts', () => {
  it('sorts by count then name', () => {
    expect(formatExtensionCounts({ '.pdf': 92, '.docx': 92, '.txt': 1 })).toBe(
      '92 .docx, 92 .pdf, 1 .txt',
    );
  });
});

describe('inferAggregationFromItems', () => {
  it('counts files, dirs, and extension groups', () => {
    const aggregation = inferAggregationFromItems([
      { name: 'a.pdf', isDir: false },
      { name: 'b.PDF', isDir: false },
      { name: 'nested', isDir: true },
      { name: 'Makefile', isDir: false },
    ]);
    expect(aggregation).toEqual({
      unfilteredTotal: 4,
      totalEntries: 4,
      totalFiles: 3,
      totalDirs: 1,
      extensionCounts: { '.pdf': 2, [NO_EXTENSION_GROUP]: 1 },
      scanCapped: false,
    });
  });
});

describe('emptyDirectoryAggregation', () => {
  it('starts at zero', () => {
    expect(emptyDirectoryAggregation().totalEntries).toBe(0);
  });
});

describe('incrementExtensionCount', () => {
  it('accumulates case-insensitively', () => {
    const counts: Record<string, number> = {};
    incrementExtensionCount(counts, 'a.PDF');
    incrementExtensionCount(counts, 'b.pdf');
    expect(counts).toEqual({ '.pdf': 2 });
  });
});
