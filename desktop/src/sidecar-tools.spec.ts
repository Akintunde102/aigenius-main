import { shouldRouteToolViaSidecar } from './sidecar-tools';

describe('shouldRouteToolViaSidecar', () => {
  const prevNodeEnv = process.env.NODE_ENV;
  const prevSidecarFlag = process.env.AIGENIUS_TOOLS_VIA_SIDECAR;

  beforeEach(() => {
    process.env.NODE_ENV = 'production';
    delete process.env.AIGENIUS_TOOLS_VIA_SIDECAR;
  });

  afterEach(() => {
    process.env.NODE_ENV = prevNodeEnv;
    if (prevSidecarFlag === undefined) {
      delete process.env.AIGENIUS_TOOLS_VIA_SIDECAR;
    } else {
      process.env.AIGENIUS_TOOLS_VIA_SIDECAR = prevSidecarFlag;
    }
  });

  it('routes simple read_file with a single path', () => {
    expect(shouldRouteToolViaSidecar('read_file', { path: 'src/index.ts' })).toBe(true);
  });

  it('skips read_file batch reads[] for main-process executor', () => {
    expect(
      shouldRouteToolViaSidecar('read_file', {
        reads: [{ path: 'src/index.ts' }],
      }),
    ).toBe(false);
  });

  it('skips git tools when cwd is omitted so main process can use active project root', () => {
    expect(shouldRouteToolViaSidecar('local_git_status', {})).toBe(false);
    expect(
      shouldRouteToolViaSidecar('local_git_status', { cwd: '/tmp/project' }),
    ).toBe(true);
  });

  it('skips grep when advanced flags are present', () => {
    expect(
      shouldRouteToolViaSidecar('local_grep', {
        pattern: 'foo',
        path: '/tmp/project',
        case_insensitive: true,
      }),
    ).toBe(false);
  });
});
