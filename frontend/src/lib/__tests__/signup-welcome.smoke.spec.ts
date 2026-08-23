/** Smoke test — verifies source is tracked; extend with behavior tests. */
import * as fs from 'fs';
import * as path from 'path';

describe('signup-welcome smoke', () => {
  it('source file exists', () => {
    const source = path.join(__dirname, '..', 'signup-welcome.ts');
    expect(fs.existsSync(source)).toBe(true);
  });
});
