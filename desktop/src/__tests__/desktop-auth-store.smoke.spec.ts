/** Smoke test — verifies source is tracked; extend with behavior tests. */
import * as fs from 'fs';
import * as path from 'path';

describe('desktop-auth-store smoke', () => {
  it('source file exists', () => {
    const source = path.join(__dirname, '..', 'desktop-auth-store.ts');
    expect(fs.existsSync(source)).toBe(true);
  });
});
