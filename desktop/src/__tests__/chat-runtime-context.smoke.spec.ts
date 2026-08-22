/** Smoke test — verifies source is tracked; extend with behavior tests. */
import * as fs from 'fs';
import * as path from 'path';

describe('chat-runtime-context smoke', () => {
  it('source file exists', () => {
    const source = path.join(__dirname, '..', 'chat-runtime-context.ts');
    expect(fs.existsSync(source)).toBe(true);
  });
});
