import {
  fetchAllCodeProjectRootHealth,
  fetchCodeProjectRootHealth,
} from '../fetch-code-project-root-health';

const getBridge = jest.fn();

jest.mock('@/lib/utils/desktop-runtime', () => ({
  getAigeniusDesktopBridgeFromBrowsingContext: () => getBridge(),
}));

describe('fetch-code-project-root-health', () => {
  beforeEach(() => {
    getBridge.mockReset();
  });

  it('returns unavailable health when desktop bridge is absent', async () => {
    getBridge.mockReturnValue(undefined);
    const health = await fetchCodeProjectRootHealth({ id: 'p1', rootPath: '/tmp/x' });
    expect(health.ok).toBe(false);
    expect(health.status).toBe('unavailable');
  });

  it('maps bridge check results', async () => {
    const check = jest.fn().mockResolvedValue({
      ok: false,
      status: 'missing',
      canRecreate: true,
    });
    getBridge.mockReturnValue({ checkCodeProjectRoot: check });
    const health = await fetchCodeProjectRootHealth({ id: 'p1', rootPath: '/tmp/x' });
    expect(check).toHaveBeenCalledWith('/tmp/x');
    expect(health.status).toBe('missing');
    expect(health.canRecreate).toBe(true);
  });

  it('fetchAllCodeProjectRootHealth returns map keyed by project id', async () => {
    getBridge.mockReturnValue({
      checkCodeProjectRoot: jest.fn().mockResolvedValue({
        ok: true,
        status: 'ok',
        canRecreate: false,
      }),
    });
    const map = await fetchAllCodeProjectRootHealth([
      { id: 'a', rootPath: '/1' },
      { id: 'b', rootPath: '/2' },
    ]);
    expect(map.a.ok).toBe(true);
    expect(map.b.ok).toBe(true);
  });
});
