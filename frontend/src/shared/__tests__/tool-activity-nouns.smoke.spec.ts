/** Smoke test — verifies source is tracked; extend with behavior tests. */
import * as fs from 'fs';
import * as path from 'path';

describe('tool-activity-nouns smoke', () => {
  it('source file exists', () => {
    const source = path.join(__dirname, '..', 'tool-activity-nouns.ts');
    expect(fs.existsSync(source)).toBe(true);
  });
});
