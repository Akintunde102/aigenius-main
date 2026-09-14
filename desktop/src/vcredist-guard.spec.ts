import { spawnSync } from 'child_process';

jest.mock('child_process', () => ({ spawnSync: jest.fn() }));

const mockedSpawnSync = spawnSync as jest.MockedFunction<typeof spawnSync>;

describe('vcredist-guard', () => {
  const originalPlatform = process.platform;

  afterEach(() => {
    Object.defineProperty(process, 'platform', { value: originalPlatform });
    jest.resetAllMocks();
  });

  describe('isVcRuntimeInstalled', () => {
    it('returns true immediately on non-Windows platforms without touching the registry', async () => {
      Object.defineProperty(process, 'platform', { value: 'darwin' });
      const { isVcRuntimeInstalled } = await import('./vcredist-guard');

      expect(isVcRuntimeInstalled()).toBe(true);
      expect(mockedSpawnSync).not.toHaveBeenCalled();
    });

    it('returns true when the registry reports the runtime as installed', async () => {
      Object.defineProperty(process, 'platform', { value: 'win32' });
      mockedSpawnSync.mockReturnValue({
        status: 0,
        stdout: '    Installed    REG_DWORD    0x1',
        stderr: '',
        pid: 1,
        output: [],
        signal: null,
      } as unknown as ReturnType<typeof spawnSync>);
      const { isVcRuntimeInstalled } = await import('./vcredist-guard');

      expect(isVcRuntimeInstalled()).toBe(true);
    });

    it('returns false when the registry key is missing (fresh Windows machine)', async () => {
      Object.defineProperty(process, 'platform', { value: 'win32' });
      mockedSpawnSync.mockReturnValue({
        status: 1,
        stdout: '',
        stderr: 'ERROR: The system was unable to find the specified registry key.',
        pid: 1,
        output: [],
        signal: null,
      } as unknown as ReturnType<typeof spawnSync>);
      const { isVcRuntimeInstalled } = await import('./vcredist-guard');

      expect(isVcRuntimeInstalled()).toBe(false);
    });

    it('fails open (assumes installed) if the registry check itself throws', async () => {
      Object.defineProperty(process, 'platform', { value: 'win32' });
      mockedSpawnSync.mockImplementation(() => {
        throw new Error('reg.exe not found');
      });
      const { isVcRuntimeInstalled } = await import('./vcredist-guard');

      expect(isVcRuntimeInstalled()).toBe(true);
    });
  });

  describe('installVcRuntimeElevated', () => {
    it('returns true immediately on non-Windows platforms', async () => {
      Object.defineProperty(process, 'platform', { value: 'darwin' });
      const { installVcRuntimeElevated } = await import('./vcredist-guard');

      expect(installVcRuntimeElevated()).toBe(true);
      expect(mockedSpawnSync).not.toHaveBeenCalled();
    });

    it('returns false when the bundled installer is not present (unpackaged/dev)', async () => {
      Object.defineProperty(process, 'platform', { value: 'win32' });
      const { installVcRuntimeElevated } = await import('./vcredist-guard');

      // jest.setup.cjs mocks electron's app.isPackaged as false, so bundledVcRedistPath() is null.
      expect(installVcRuntimeElevated()).toBe(false);
      expect(mockedSpawnSync).not.toHaveBeenCalled();
    });
  });
});
