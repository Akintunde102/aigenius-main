/** Smoke test — verifies source is tracked; extend with behavior tests. */
import * as fs from 'fs';
import * as path from 'path';

describe('get-record-and-structure-map smoke', () => {
  it('source file exists', () => {
    const source = path.join(__dirname, '..', 'get-record-and-structure-map.ts');
    expect(fs.existsSync(source)).toBe(true);
  });
});
