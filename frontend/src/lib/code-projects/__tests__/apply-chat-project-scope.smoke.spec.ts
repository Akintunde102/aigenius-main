/** Smoke test — verifies source is tracked; extend with behavior tests. */
import * as fs from 'fs';
import * as path from 'path';

describe('apply-chat-project-scope smoke', () => {
  it('source file exists', () => {
    const source = path.join(__dirname, '..', 'apply-chat-project-scope.ts');
    expect(fs.existsSync(source)).toBe(true);
  });
});
