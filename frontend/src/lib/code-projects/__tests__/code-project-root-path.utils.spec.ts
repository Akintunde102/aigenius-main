import { codeProjectRootPathsEqual } from '../code-project-root-path.utils';

describe('codeProjectRootPathsEqual', () => {
  it('treats Windows paths as equal regardless of slash style or casing', () => {
    expect(
      codeProjectRootPathsEqual('C:\\Users\\me\\Documents\\AIGenius Projects\\Demo', 'c:/users/me/documents/AIGenius Projects/Demo'),
    ).toBe(true);
  });

  it('treats trailing slashes as equal', () => {
    expect(codeProjectRootPathsEqual('/home/me/Demo/', '/home/me/Demo')).toBe(true);
  });

  it('rejects different folders', () => {
    expect(codeProjectRootPathsEqual('C:\\work\\a', 'C:\\work\\b')).toBe(false);
  });
});
