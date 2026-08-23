/** Smoke test — verifies source is tracked; extend with behavior tests. */
import * as fs from 'fs';
import * as path from 'path';

describe('tool-display-names smoke', () => {
  it('source file exists', () => {
    const source = path.join(__dirname, '..', 'tool-display-names.ts');
    expect(fs.existsSync(source)).toBe(true);
  });
});
