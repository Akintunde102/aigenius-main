import {
  applyCreateNamedFolderResult,
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
