import {
  registerAbsolutePathForPreview,
  registerRagHitsForPreview,
  registerReadFileBatchForPreview,
} from './register-preview-paths';
import { registerPreviewPath } from '../preview-path-registry';

jest.mock('../preview-path-registry', () => ({
  registerPreviewPath: jest.fn(),
}));

describe('register-preview-paths', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('registers absolute file path and parent directory', () => {
    registerAbsolutePathForPreview('/home/user/nested/doc2.pdf');
    expect(registerPreviewPath).toHaveBeenCalledWith('/home/user/nested/doc2.pdf');
    expect(registerPreviewPath).toHaveBeenCalledWith('/home/user/nested');
  });

  it('skips relative paths', () => {
    registerAbsolutePathForPreview('relative/path.txt');
    expect(registerPreviewPath).not.toHaveBeenCalled();
  });

  it('registers RAG hit paths from hits array', () => {
    registerRagHitsForPreview([
      { path: '/home/user/doc1.txt' },
      { path: 'relative/path.txt' },
    ]);
    expect(registerPreviewPath).toHaveBeenCalledWith('/home/user/doc1.txt');
    expect(registerPreviewPath).toHaveBeenCalledWith('/home/user');
    expect(registerPreviewPath).not.toHaveBeenCalledWith('relative/path.txt');
  });

  it('registers read_file batch using resolvedPath', () => {
    registerReadFileBatchForPreview([
      { path: 'src/app.ts', resolvedPath: '/proj/src/app.ts', status: 'ok' },
      { path: 'missing.ts', status: 'error' },
    ]);
    expect(registerPreviewPath).toHaveBeenCalledWith('/proj/src/app.ts');
    expect(registerPreviewPath).toHaveBeenCalledWith('/proj/src');
  });

  it('falls back to absolute path field when resolvedPath omitted', () => {
    registerReadFileBatchForPreview([{ path: '/abs/file.ts', status: 'ok' }]);
    expect(registerPreviewPath).toHaveBeenCalledWith('/abs/file.ts');
  });
});
