/** Smoke test — verifies source is tracked; extend with behavior tests. */
import * as fs from 'fs';
import * as path from 'path';

describe('SearchIndexPaginationFooter smoke', () => {
  it('source file exists', () => {
    const source = path.join(__dirname, '..', 'SearchIndexPaginationFooter.tsx');
    expect(fs.existsSync(source)).toBe(true);
  });
});
