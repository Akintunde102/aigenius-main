/** Smoke test — verifies source is tracked; extend with behavior tests. */
import * as fs from 'fs';
import * as path from 'path';

describe('useKeyboardShortcuts smoke', () => {
  it('source file exists', () => {
    const source = path.join(__dirname, '..', 'useKeyboardShortcuts.ts');
    expect(fs.existsSync(source)).toBe(true);
  });
});
