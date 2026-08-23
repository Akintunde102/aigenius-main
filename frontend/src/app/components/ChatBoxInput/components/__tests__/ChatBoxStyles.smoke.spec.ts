/** Smoke test — verifies source is tracked; extend with behavior tests. */
import * as fs from 'fs';
import * as path from 'path';

describe('ChatBoxStyles smoke', () => {
  it('source file exists', () => {
    const source = path.join(__dirname, '..', 'ChatBoxStyles.tsx');
    expect(fs.existsSync(source)).toBe(true);
  });
});
