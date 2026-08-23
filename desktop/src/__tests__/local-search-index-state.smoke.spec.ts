/** Smoke test — verifies source is tracked; extend with behavior tests. */
import * as fs from 'fs';
import * as path from 'path';

describe('local-search-index-state smoke', () => {
  it('source file exists', () => {
    const source = path.join(__dirname, '..', 'local-search-index-state.ts');
    expect(fs.existsSync(source)).toBe(true);
  });
});
