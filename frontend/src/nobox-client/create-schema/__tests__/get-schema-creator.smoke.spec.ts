/** Smoke test — verifies source is tracked; extend with behavior tests. */
import * as fs from 'fs';
import * as path from 'path';

describe('get-schema-creator smoke', () => {
  it('source file exists', () => {
    const source = path.join(__dirname, '..', 'get-schema-creator.ts');
    expect(fs.existsSync(source)).toBe(true);
  });
});
