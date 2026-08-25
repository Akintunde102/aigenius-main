/** @jest-environment node */

const mockIsPackaged = jest.fn(() => false);

jest.mock('electron', () => ({
  app: {
    get isPackaged() {
      return mockIsPackaged();
    },
  },
}));

describe('resolveMiniServerPort', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    delete process.env.AIGENIUS_MINI_SERVER_PORT;
    delete process.env.DEV_SIDECAR_PORT;
    mockIsPackaged.mockReturnValue(false);
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('uses explicit AIGENIUS_MINI_SERVER_PORT when set', async () => {
    process.env.AIGENIUS_MINI_SERVER_PORT = '9001';
    const { resolveMiniServerPort } = await import('./mini-server-port');
    expect(resolveMiniServerPort()).toBe('9001');
  });

  it('defaults to 28001 in unpackaged Tilt dev', async () => {
    const { resolveMiniServerPort } = await import('./mini-server-port');
    expect(resolveMiniServerPort()).toBe('28001');
  });

  it('defaults to 8001 in packaged builds', async () => {
    mockIsPackaged.mockReturnValue(true);
    const { resolveMiniServerPort } = await import('./mini-server-port');
    expect(resolveMiniServerPort()).toBe('8001');
  });
});
