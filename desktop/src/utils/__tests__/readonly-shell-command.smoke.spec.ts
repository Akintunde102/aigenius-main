/** Smoke test — verifies source is tracked; extend with behavior tests. */
import * as fs from 'fs';
import * as path from 'path';

describe('readonly-shell-command smoke', () => {
  it('source file exists', () => {
    const source = path.join(__dirname, '..', 'readonly-shell-command.ts');
    expect(fs.existsSync(source)).toBe(true);
  });
});
