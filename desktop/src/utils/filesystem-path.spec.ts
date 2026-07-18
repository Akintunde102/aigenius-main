import os from 'os';
import path from 'path';

import { expandTildeInPath } from './filesystem-path';

describe('expandTildeInPath', () => {
  it('expands ~ and ~/ paths to the user home directory', () => {
    const home = os.homedir();
    expect(expandTildeInPath('~')).toBe(home);
    expect(expandTildeInPath('~/Documents/report.pdf')).toBe(
      path.join(home, 'Documents/report.pdf'),
    );
  });

  it('leaves true absolute paths unchanged', () => {
    const absolute = path.join(os.homedir(), 'already-absolute.txt');
    expect(expandTildeInPath(absolute)).toBe(absolute);
  });
});
