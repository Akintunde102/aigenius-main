/** Smoke test — verifies source is tracked; extend with behavior tests. */
import * as fs from 'fs';
import * as path from 'path';

describe('user-files.theme smoke', () => {
  it('source file exists', () => {
    const source = path.join(__dirname, '..', 'user-files.theme.ts');
    expect(fs.existsSync(source)).toBe(true);
  });
});
