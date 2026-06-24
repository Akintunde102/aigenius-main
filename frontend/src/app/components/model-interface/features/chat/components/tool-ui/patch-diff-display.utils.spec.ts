import { classifyDiffLine } from './patch-diff-display.utils';

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
