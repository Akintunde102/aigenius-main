/** Smoke test — verifies source is tracked; extend with behavior tests. */
import * as fs from 'fs';
import * as path from 'path';

describe('ComposerMessageQueue smoke', () => {
  it('source file exists', () => {
    const source = path.join(__dirname, '..', 'ComposerMessageQueue.tsx');
    expect(fs.existsSync(source)).toBe(true);
  });
});
