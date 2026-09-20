import {
  applyCreateNamedFolderResult,
  deriveProjectNameFromPath,
  resolveNameForNamedFolderCreate,
} from './named-project-folder.utils';

describe('resolveNameForNamedFolderCreate', () => {
  it('uses the typed name when present', () => {
    expect(resolveNameForNamedFolderCreate('  my-app  ', () => 'generated-name')).toEqual({
      name: 'my-app',
      generated: false,
    });
  });

  it('generates a name when the field is empty so one click still works', () => {
    const generateName = jest.fn(() => 'swift-atlas-42');
    expect(resolveNameForNamedFolderCreate('   ', generateName)).toEqual({
      name: 'swift-atlas-42',
      generated: true,
    });
    expect(generateName).toHaveBeenCalledTimes(1);
  });
});

describe('applyCreateNamedFolderResult', () => {
  it('fills the path after a successful create', () => {
    expect(applyCreateNamedFolderResult({ ok: true, path: '/tmp/my-app', created: true })).toEqual({
      status: 'filled',
      path: '/tmp/my-app',
    });
  });

  it('does not overwrite the path when the picker is canceled', () => {
    expect(applyCreateNamedFolderResult({ ok: true, canceled: true })).toEqual({
      status: 'canceled',
    });
  });

  it('surfaces IPC and missing-result errors', () => {
    expect(applyCreateNamedFolderResult({ ok: false, error: 'Permission denied creating that folder' })).toEqual({
      status: 'error',
      message: 'Permission denied creating that folder',
    });
    expect(applyCreateNamedFolderResult(null)).toEqual({
      status: 'error',
      message: 'Could not create folder',
    });
  });
});

describe('deriveProjectNameFromPath', () => {
  it('returns leaf folder name when no existing project names collide', () => {
    expect(deriveProjectNameFromPath('C:\\Users\\DELL5530\\Desktop\\account')).toBe('account');
    expect(deriveProjectNameFromPath('/home/user/my-project/')).toBe('my-project');
  });

  it('disambiguates using parent folder names when leaf name already exists', () => {
    const existing = [{ name: 'account' }];
    expect(deriveProjectNameFromPath('C:\\Users\\DELL5530\\Desktop\\account', existing)).toBe('Desktop/account');
    expect(deriveProjectNameFromPath('/home/user/account', existing)).toBe('user/account');
  });

  it('uses deeper parent folders when depth 2 also collides e.g. desktop/account vs home/account', () => {
    const existing = [{ name: 'account' }, { name: 'desktop/account' }];
    expect(deriveProjectNameFromPath('C:\\Users\\DELL5530\\desktop\\account', existing)).toBe('DELL5530/desktop/account');
    expect(deriveProjectNameFromPath('/home/user/account', [{ name: 'account' }])).toBe('user/account');
  });

  it('handles empty or whitespace inputs gracefully', () => {
    expect(deriveProjectNameFromPath('')).toBe('');
    expect(deriveProjectNameFromPath('   ')).toBe('');
  });
});

