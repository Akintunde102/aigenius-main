/** Smoke test — verifies source is tracked; extend with behavior tests. */
import * as fs from 'fs';
import * as path from 'path';

describe('list-row smoke', () => {
  it('source file exists', () => {
    const source = path.join(__dirname, '..', 'list-row.tsx');
    expect(fs.existsSync(source)).toBe(true);
  });
});
