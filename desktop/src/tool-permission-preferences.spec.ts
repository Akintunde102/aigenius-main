import {
  applySyncedToolPermissionPreferences,
  normalizeDesktopToolId,
  resetToolPermissionPreferencesCacheForTests,
  shouldRequireToolApproval,
} from './tool-permission-preferences';

jest.mock('electron', () => ({
  app: {
    getPath: jest.fn(() => '/tmp/aigenius-test'),
  },
}));

jest.mock('fs/promises', () => ({
  readFile: jest.fn().mockRejectedValue(new Error('missing')),
  writeFile: jest.fn().mockResolvedValue(undefined),
  mkdir: jest.fn().mockResolvedValue(undefined),
}));

describe('tool-permission-preferences', () => {
  beforeEach(() => {
    resetToolPermissionPreferencesCacheForTests();
  });

  it('normalizes run_command to local_shell', () => {
    expect(normalizeDesktopToolId('run_command')).toBe('local_shell');
  });

  it('normalizes read_file aliases to local_read_file', () => {
    expect(normalizeDesktopToolId('read_file')).toBe('local_read_file');
    expect(normalizeDesktopToolId('read_local_file')).toBe('local_read_file');
  });

  it('requires approval for shell by default', () => {
    applySyncedToolPermissionPreferences({
      autoApproveAll: false,
      requireApprovalByTool: {},
    });
    expect(shouldRequireToolApproval('local_shell')).toBe(true);
  });

  it('skips approval when autoApproveAll is enabled', () => {
    applySyncedToolPermissionPreferences({
      autoApproveAll: true,
      requireApprovalByTool: { local_shell: true },
    });
    expect(shouldRequireToolApproval('local_shell')).toBe(false);
  });

  it('defaults file-altering local tools to ask first', () => {
    applySyncedToolPermissionPreferences({
      autoApproveAll: false,
      requireApprovalByTool: {},
    });
    expect(shouldRequireToolApproval('local_retrieval_memory_upsert')).toBe(true);
  });
});
