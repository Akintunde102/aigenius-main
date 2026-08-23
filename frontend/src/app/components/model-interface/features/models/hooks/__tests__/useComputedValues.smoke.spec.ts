/** Smoke test — verifies source is tracked; extend with behavior tests. */
import * as fs from 'fs';
import * as path from 'path';

describe('useComputedValues smoke', () => {
  it('source file exists', () => {
    const source = path.join(__dirname, '..', 'useComputedValues.ts');
    expect(fs.existsSync(source)).toBe(true);
  });
});
