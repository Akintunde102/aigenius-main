/** Smoke test — verifies source is tracked; extend with behavior tests. */
import * as fs from 'fs';
import * as path from 'path';

describe('workflow-display-formatters smoke', () => {
  it('source file exists', () => {
    const source = path.join(__dirname, '..', 'workflow-display-formatters.ts');
    expect(fs.existsSync(source)).toBe(true);
  });
});
