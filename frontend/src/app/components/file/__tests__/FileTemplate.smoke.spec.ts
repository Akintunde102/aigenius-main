/** Smoke test — verifies source is tracked; extend with behavior tests. */
import * as fs from 'fs';
import * as path from 'path';

describe('FileTemplate smoke', () => {
  it('source file exists', () => {
    const source = path.join(__dirname, '..', 'FileTemplate.tsx');
    expect(fs.existsSync(source)).toBe(true);
  });
});
