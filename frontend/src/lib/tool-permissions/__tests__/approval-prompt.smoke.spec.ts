/** Smoke test — verifies source is tracked; extend with behavior tests. */
import * as fs from 'fs';
import * as path from 'path';

describe('approval-prompt smoke', () => {
  it('source file exists', () => {
    const source = path.join(__dirname, '..', 'approval-prompt.ts');
    expect(fs.existsSync(source)).toBe(true);
  });
});
