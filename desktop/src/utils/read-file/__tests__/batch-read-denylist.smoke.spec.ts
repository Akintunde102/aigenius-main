/** Smoke test — verifies source is tracked; extend with behavior tests. */
import * as fs from 'fs';
import * as path from 'path';

describe('batch-read-denylist smoke', () => {
  it('source file exists', () => {
    const source = path.join(__dirname, '..', 'batch-read-denylist.ts');
    expect(fs.existsSync(source)).toBe(true);
  });
});
