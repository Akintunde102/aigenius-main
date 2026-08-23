/** Smoke test — verifies source is tracked; extend with behavior tests. */
import * as fs from 'fs';
import * as path from 'path';

describe('get-logged-user-details smoke', () => {
  it('source file exists', () => {
    const source = path.join(__dirname, '..', 'get-logged-user-details.ts');
    expect(fs.existsSync(source)).toBe(true);
  });
});
