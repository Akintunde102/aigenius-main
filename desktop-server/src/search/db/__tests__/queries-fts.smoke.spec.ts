/** Smoke test — verifies source is tracked; extend with behavior tests. */
import * as fs from 'fs';
import * as path from 'path';

describe('queries-fts smoke', () => {
  it('source file exists', () => {
    const source = path.join(__dirname, '..', 'queries-fts.ts');
    expect(fs.existsSync(source)).toBe(true);
  });
});
