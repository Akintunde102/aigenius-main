/** Smoke test — verifies source is tracked; extend with behavior tests. */
import * as fs from 'fs';
import * as path from 'path';

describe('public-page-shell.constants smoke', () => {
  it('source file exists', () => {
    const source = path.join(__dirname, '..', 'public-page-shell.constants.ts');
    expect(fs.existsSync(source)).toBe(true);
  });
});
