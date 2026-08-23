/** Smoke test — verifies source is tracked; extend with behavior tests. */
import * as fs from 'fs';
import * as path from 'path';

describe('local-apply-patch-types smoke', () => {
  it('source file exists', () => {
    const source = path.join(__dirname, '..', 'local-apply-patch-types.ts');
    expect(fs.existsSync(source)).toBe(true);
  });
});
