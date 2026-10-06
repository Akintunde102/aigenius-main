import {
  buildCodeProjectRootHealth,
  isProjectFolderMissing,
  mapBridgeStatusToHealthStatus,
} from '../check-code-project-root-health';

describe('check-code-project-root-health', () => {
  it('maps bridge statuses', () => {
    expect(mapBridgeStatusToHealthStatus('missing')).toBe('missing');
    expect(mapBridgeStatusToHealthStatus('weird')).toBe('unknown');
  });

  it('builds health from bridge result', () => {
    const health = buildCodeProjectRootHealth(
      'p1',
      '/tmp/proj',
      { ok: false, status: 'missing', canRecreate: true },
      '2026-01-01T00:00:00.000Z',
    );
    expect(health.ok).toBe(false);
    expect(health.canRecreate).toBe(true);
    expect(isProjectFolderMissing(health)).toBe(true);
  });

  it('marks unavailable when bridge is null', () => {
    const health = buildCodeProjectRootHealth('p1', '/tmp', null, '2026-01-01T00:00:00.000Z');
    expect(health.status).toBe('unavailable');
    expect(isProjectFolderMissing(health)).toBe(false);
  });
});
