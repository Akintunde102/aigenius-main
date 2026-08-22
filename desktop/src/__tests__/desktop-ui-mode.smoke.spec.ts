/** Smoke test — verifies source is tracked; extend with behavior tests. */
import * as fs from 'fs';
import * as path from 'path';

describe('desktop-ui-mode smoke', () => {
  it('source file exists', () => {
    const source = path.join(__dirname, '..', 'desktop-ui-mode.ts');
    expect(fs.existsSync(source)).toBe(true);
  });
});
