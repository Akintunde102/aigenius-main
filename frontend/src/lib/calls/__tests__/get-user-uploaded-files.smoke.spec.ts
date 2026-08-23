/** Smoke test — verifies source is tracked; extend with behavior tests. */
import * as fs from 'fs';
import * as path from 'path';

describe('get-user-uploaded-files smoke', () => {
  it('source file exists', () => {
    const source = path.join(__dirname, '..', 'get-user-uploaded-files.ts');
    expect(fs.existsSync(source)).toBe(true);
  });
});
