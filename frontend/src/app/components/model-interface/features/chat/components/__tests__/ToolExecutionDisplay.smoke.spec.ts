/** Smoke test — verifies source is tracked; extend with behavior tests. */
import * as fs from 'fs';
import * as path from 'path';

describe('ToolExecutionDisplay smoke', () => {
  it('source file exists', () => {
    const source = path.join(__dirname, '..', 'ToolExecutionDisplay.tsx');
    expect(fs.existsSync(source)).toBe(true);
  });
});
