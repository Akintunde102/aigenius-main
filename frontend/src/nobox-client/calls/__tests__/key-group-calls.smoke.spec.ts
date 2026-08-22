/** Smoke test — verifies source is tracked; extend with behavior tests. */
import * as fs from 'fs';
import * as path from 'path';

describe('key-group-calls smoke', () => {
  it('source file exists', () => {
    const source = path.join(__dirname, '..', 'key-group-calls.ts');
    expect(fs.existsSync(source)).toBe(true);
  });
});
