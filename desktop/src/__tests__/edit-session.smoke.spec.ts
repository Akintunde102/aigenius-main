/** Smoke test — verifies source is tracked; extend with behavior tests. */
import * as fs from 'fs';
import * as path from 'path';

describe('edit-session smoke', () => {
  it('source file exists', () => {
    const source = path.join(__dirname, '..', 'edit-session.ts');
    expect(fs.existsSync(source)).toBe(true);
  });
});
