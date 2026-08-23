/** Smoke test — verifies source is tracked; extend with behavior tests. */
import * as fs from 'fs';
import * as path from 'path';

describe('main-application-menu smoke', () => {
  it('source file exists', () => {
    const source = path.join(__dirname, '..', 'main-application-menu.ts');
    expect(fs.existsSync(source)).toBe(true);
  });
});
