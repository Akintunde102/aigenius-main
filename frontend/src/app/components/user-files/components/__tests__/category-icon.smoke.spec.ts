/** Smoke test — verifies source is tracked; extend with behavior tests. */
import * as fs from 'fs';
import * as path from 'path';

describe('category-icon smoke', () => {
  it('source file exists', () => {
    const source = path.join(__dirname, '..', 'category-icon.tsx');
    expect(fs.existsSync(source)).toBe(true);
  });
});
