/** Smoke test — verifies source is tracked; extend with behavior tests. */
import * as fs from 'fs';
import * as path from 'path';

describe('resolve-gateway-api-root smoke', () => {
  it('source file exists', () => {
    const source = path.join(__dirname, '..', 'resolve-gateway-api-root.ts');
    expect(fs.existsSync(source)).toBe(true);
  });
});
