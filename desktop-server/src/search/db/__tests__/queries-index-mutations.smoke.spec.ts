/** Smoke test — verifies source is tracked; extend with behavior tests. */
import * as fs from 'fs';
import * as path from 'path';

describe('queries-index-mutations smoke', () => {
  it('source file exists', () => {
    const source = path.join(__dirname, '..', 'queries-index-mutations.ts');
    expect(fs.existsSync(source)).toBe(true);
  });
});
