/** Smoke test — verifies source is tracked; extend with behavior tests. */
import * as fs from 'fs';
import * as path from 'path';

describe('get-token smoke', () => {
  it('source file exists', () => {
    const source = path.join(__dirname, '..', 'get-token.ts');
    expect(fs.existsSync(source)).toBe(true);
  });
});
