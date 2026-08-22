/** Smoke test — verifies source is tracked; extend with behavior tests. */
import * as fs from 'fs';
import * as path from 'path';

describe('WorkflowToolResponsePanel smoke', () => {
  it('source file exists', () => {
    const source = path.join(__dirname, '..', 'WorkflowToolResponsePanel.tsx');
    expect(fs.existsSync(source)).toBe(true);
  });
});
