/** Smoke test — verifies source is tracked; extend with behavior tests. */
import * as fs from 'fs';
import * as path from 'path';

describe('chunk-load-recovery smoke', () => {
  it('source file exists', () => {
    const source = path.join(__dirname, '..', 'chunk-load-recovery.ts');
    expect(fs.existsSync(source)).toBe(true);
  });
});
