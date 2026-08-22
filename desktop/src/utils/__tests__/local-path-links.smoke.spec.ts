/** Smoke test — verifies source is tracked; extend with behavior tests. */
import * as fs from 'fs';
import * as path from 'path';

describe('local-path-links smoke', () => {
  it('source file exists', () => {
    const source = path.join(__dirname, '..', 'local-path-links.ts');
    expect(fs.existsSync(source)).toBe(true);
  });
});
