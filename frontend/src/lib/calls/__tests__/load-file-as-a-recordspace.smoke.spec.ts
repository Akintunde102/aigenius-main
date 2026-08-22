/** Smoke test — verifies source is tracked; extend with behavior tests. */
import * as fs from 'fs';
import * as path from 'path';

describe('load-file-as-a-recordspace smoke', () => {
  it('source file exists', () => {
    const source = path.join(__dirname, '..', 'load-file-as-a-recordspace.ts');
    expect(fs.existsSync(source)).toBe(true);
  });
});
