/** Smoke test — verifies source is tracked; extend with behavior tests. */
import * as fs from 'fs';
import * as path from 'path';

describe('workflow-token.utils smoke', () => {
  it('source file exists', () => {
    const source = path.join(__dirname, '..', 'workflow-token.utils.ts');
    expect(fs.existsSync(source)).toBe(true);
  });
});
