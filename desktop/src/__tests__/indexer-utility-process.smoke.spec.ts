/** Smoke test — verifies source is tracked; extend with behavior tests. */
import * as fs from 'fs';
import * as path from 'path';

describe('indexer-utility-process smoke', () => {
  it('source file exists', () => {
    const source = path.join(__dirname, '..', 'indexer-utility-process.ts');
    expect(fs.existsSync(source)).toBe(true);
  });
});
