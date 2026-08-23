/** Smoke test — verifies source is tracked; extend with behavior tests. */
import * as fs from 'fs';
import * as path from 'path';

describe('project-architecture-memory smoke', () => {
  it('source file exists', () => {
    const source = path.join(__dirname, '..', 'project-architecture-memory.ts');
    expect(fs.existsSync(source)).toBe(true);
  });
});
