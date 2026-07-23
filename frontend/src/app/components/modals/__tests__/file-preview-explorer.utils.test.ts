import {
  canonicalDirKey,
  getDirectoriesToReveal,
  pathsEqual,
  pickMoreSpecificRoot,
  resolveExplorerRoot,
} from '../file-preview-explorer.utils';

const mockGetActiveCodeProject = jest.fn(() => null);

jest.mock('@/lib/code-projects/active-code-project', () => ({
  getActiveCodeProject: () => mockGetActiveCodeProject(),
}));

describe('file-preview-explorer.utils', () => {
  beforeEach(() => {
    mockGetActiveCodeProject.mockReturnValue(null);
  });

  it('treats Windows paths with different separators and casing as equal', () => {
    expect(pathsEqual('C:\\Users\\Project\\src', 'c:/users/project/src')).toBe(true);
    expect(canonicalDirKey('C:\\Users\\Project\\src\\')).toBe('c:/users/project/src');
  });

  it('uses the opened directory as root when target is a directory', () => {
    const folder = 'C:\\Users\\DELL5530\\Desktop\\projects\\H4L-OS';
    expect(resolveExplorerRoot(folder, true)).toBe(folder);
  });

  it('uses the parent directory as root for file targets', () => {
    const file = 'C:\\Users\\DELL5530\\Desktop\\projects\\H4L-OS\\README.md';
    expect(resolveExplorerRoot(file, false)).toBe('C:\\Users\\DELL5530\\Desktop\\projects\\H4L-OS');
  });

  it('reveals ancestor directories for nested file paths', () => {
    const root = 'C:\\Users\\project';
    const file = 'C:\\Users\\project\\src\\app\\page.tsx';
    expect(getDirectoriesToReveal(file, root, false)).toEqual([
      root,
      'C:\\Users\\project\\src',
      'C:\\Users\\project\\src\\app',
    ]);
  });

  it('includes the target directory itself when revealing a folder path', () => {
    const root = 'C:\\Users\\project';
    const folder = 'C:\\Users\\project\\src\\components';
    expect(getDirectoriesToReveal(folder, root, true)).toEqual([
      root,
      'C:\\Users\\project\\src',
      'C:\\Users\\project\\src\\components',
    ]);
  });

  it('prefers the opened folder over a broader active project root', () => {
    const projectsRoot = 'C:\\Users\\DELL5530\\Desktop\\projects';
    const folder = 'C:\\Users\\DELL5530\\Desktop\\projects\\H4L-OS';
    mockGetActiveCodeProject.mockReturnValue({
      id: 'projects',
      name: 'projects',
      rootPath: projectsRoot,
    });

    expect(resolveExplorerRoot(folder, true)).toBe(folder);
    expect(pickMoreSpecificRoot(folder, projectsRoot)).toBe(folder);
  });

  it('prefers the file parent directory over a broader active project root', () => {
    const projectsRoot = 'C:\\Users\\DELL5530\\Desktop\\projects';
    const file = 'C:\\Users\\DELL5530\\Desktop\\projects\\H4L-OS\\README.md';
    mockGetActiveCodeProject.mockReturnValue({
      id: 'projects',
      name: 'projects',
      rootPath: projectsRoot,
    });

    expect(resolveExplorerRoot(file, false)).toBe('C:\\Users\\DELL5530\\Desktop\\projects\\H4L-OS');
  });

  it('uses the active project root when it is more specific than the file parent', () => {
    const projectRoot = 'C:\\Users\\DELL5530\\Desktop\\projects\\H4L-OS';
    const file = 'C:\\Users\\DELL5530\\Desktop\\projects\\H4L-OS\\src\\app.ts';
    mockGetActiveCodeProject.mockReturnValue({
      id: 'h4l',
      name: 'H4L-OS',
      rootPath: projectRoot,
    });

    expect(resolveExplorerRoot(file, false)).toBe('C:\\Users\\DELL5530\\Desktop\\projects\\H4L-OS\\src');
  });
});
