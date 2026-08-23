/** Smoke test — verifies source is tracked; extend with behavior tests. */
import * as fs from 'fs';
import * as path from 'path';

describe('chat-shell-prefetch smoke', () => {
  it('source file exists', () => {
    const source = path.join(__dirname, '..', 'chat-shell-prefetch.ts');
    expect(fs.existsSync(source)).toBe(true);
  });
});
