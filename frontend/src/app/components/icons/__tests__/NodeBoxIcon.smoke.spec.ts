/** Smoke test — verifies source is tracked; extend with behavior tests. */
import * as fs from 'fs';
import * as path from 'path';

describe('NodeBoxIcon smoke', () => {
  it('source file exists', () => {
    const source = path.join(__dirname, '..', 'NodeBoxIcon.tsx');
    expect(fs.existsSync(source)).toBe(true);
  });
});
