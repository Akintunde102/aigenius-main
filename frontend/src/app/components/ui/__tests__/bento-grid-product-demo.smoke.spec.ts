/** Smoke test — verifies source is tracked; extend with behavior tests. */
import * as fs from 'fs';
import * as path from 'path';

describe('bento-grid-product-demo smoke', () => {
  it('source file exists', () => {
    const source = path.join(__dirname, '..', 'bento-grid-product-demo.tsx');
    expect(fs.existsSync(source)).toBe(true);
  });
});
