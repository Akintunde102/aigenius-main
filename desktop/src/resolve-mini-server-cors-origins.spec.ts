const corsOriginsMockIsPackaged = { value: false };

jest.mock('electron', () => ({
  app: {
    get isPackaged() {
      return corsOriginsMockIsPackaged.value;
    },
  },
}));

describe('resolveMiniServerCorsOrigins', () => {
  beforeEach(() => {
    corsOriginsMockIsPackaged.value = false;
    delete process.env.AIGENIUS_DESKTOP_CORS_ORIGINS;
    delete process.env.AIGENIUS_DESKTOP_UI_PROTOCOL;
    jest.resetModules();
  });

  it('includes loopback UI origins for dev HTTP shell', async () => {
    const { resolveMiniServerCorsOrigins } = await import('./resolve-mini-server-cors-origins');
    const value = resolveMiniServerCorsOrigins('23001');

    expect(value).toBe('http://localhost:23001,http://127.0.0.1:23001');
  });

  it('adds aigenius://app when packaged custom protocol is enabled', async () => {
    corsOriginsMockIsPackaged.value = true;
    const { resolveMiniServerCorsOrigins } = await import('./resolve-mini-server-cors-origins');
    const value = resolveMiniServerCorsOrigins('8001');

    expect(value).toContain('aigenius://app');
    expect(value).toContain('http://localhost:8001');
    expect(value).toContain('http://127.0.0.1:8001');
  });

  it('omits aigenius://app when packaged HTTP UI is forced', async () => {
    corsOriginsMockIsPackaged.value = true;
    process.env.AIGENIUS_DESKTOP_UI_PROTOCOL = '0';
    const { resolveMiniServerCorsOrigins } = await import('./resolve-mini-server-cors-origins');
    const value = resolveMiniServerCorsOrigins('8001');

    expect(value).not.toContain('aigenius://app');
    expect(value).toBe('http://localhost:8001,http://127.0.0.1:8001');
  });

  it('merges explicit AIGENIUS_DESKTOP_CORS_ORIGINS without duplicates', async () => {
    corsOriginsMockIsPackaged.value = true;
    process.env.AIGENIUS_DESKTOP_CORS_ORIGINS = 'https://extra.example,aigenius://app';
    const { resolveMiniServerCorsOrigins } = await import('./resolve-mini-server-cors-origins');
    const value = resolveMiniServerCorsOrigins('8001');
    const origins = value.split(',');

    expect(origins).toContain('https://extra.example');
    expect(origins).toContain('aigenius://app');
    expect(origins.filter((o) => o === 'aigenius://app')).toHaveLength(1);
  });
});
