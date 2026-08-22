/** Smoke test — verifies source is tracked; extend with behavior tests. */
import * as fs from 'fs';
import * as path from 'path';

describe('git-project-files smoke', () => {
  it('source file exists', () => {
    const source = path.join(__dirname, '..', 'git-project-files.ts');
    expect(fs.existsSync(source)).toBe(true);
  });
});
