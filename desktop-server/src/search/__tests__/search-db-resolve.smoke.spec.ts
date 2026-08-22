/** Smoke test — verifies source is tracked; extend with behavior tests. */
import * as fs from 'fs';
import * as path from 'path';

describe('search-db-resolve smoke', () => {
  it('source file exists', () => {
    const source = path.join(__dirname, '..', 'search-db-resolve.ts');
    expect(fs.existsSync(source)).toBe(true);
  });
});
