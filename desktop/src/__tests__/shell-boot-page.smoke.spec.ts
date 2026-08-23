/** Smoke test — verifies source is tracked; extend with behavior tests. */
import * as fs from 'fs';
import * as path from 'path';

describe('shell-boot-page smoke', () => {
  it('source file exists', () => {
    const source = path.join(__dirname, '..', 'shell-boot-page.ts');
    expect(fs.existsSync(source)).toBe(true);
  });
});
