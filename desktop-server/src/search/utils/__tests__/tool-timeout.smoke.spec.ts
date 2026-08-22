/** Smoke test — verifies source is tracked; extend with behavior tests. */
import * as fs from 'fs';
import * as path from 'path';

describe('tool-timeout smoke', () => {
  it('source file exists', () => {
    const source = path.join(__dirname, '..', 'tool-timeout.ts');
    expect(fs.existsSync(source)).toBe(true);
  });
});
