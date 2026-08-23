/** Smoke test — verifies source is tracked; extend with behavior tests. */
import * as fs from 'fs';
import * as path from 'path';

describe('useInfoSkip smoke', () => {
  it('source file exists', () => {
    const source = path.join(__dirname, '..', 'useInfoSkip.ts');
    expect(fs.existsSync(source)).toBe(true);
  });
});
