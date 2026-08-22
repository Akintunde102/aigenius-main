/** Smoke test — verifies source is tracked; extend with behavior tests. */
import * as fs from 'fs';
import * as path from 'path';

describe('legacy-api-roots smoke', () => {
  it('source file exists', () => {
    const source = path.join(__dirname, '..', 'legacy-api-roots.ts');
    expect(fs.existsSync(source)).toBe(true);
  });
});
