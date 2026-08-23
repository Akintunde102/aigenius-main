/** Smoke test — verifies source is tracked; extend with behavior tests. */
import * as fs from 'fs';
import * as path from 'path';

describe('stale-edge-sweep smoke', () => {
  it('source file exists', () => {
    const source = path.join(__dirname, '..', 'stale-edge-sweep.ts');
    expect(fs.existsSync(source)).toBe(true);
  });
});
