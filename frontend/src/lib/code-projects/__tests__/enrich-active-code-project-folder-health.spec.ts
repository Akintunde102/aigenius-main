import { enrichActiveCodeProjectWithFolderHealth } from '../enrich-active-code-project-folder-health';
import type { CodeProjectRootHealth } from '../code-project-root-health.types';

const basePayload = {
  id: 'p1',
  name: 'Demo',
  rootPath: '/tmp/demo',
};

describe('enrichActiveCodeProjectWithFolderHealth', () => {
  it('returns payload unchanged when health is missing', () => {
    expect(enrichActiveCodeProjectWithFolderHealth(basePayload, undefined)).toEqual(basePayload);
  });

  it('returns payload unchanged when health project id mismatches', () => {
    const health: CodeProjectRootHealth = {
      projectId: 'other',
      rootPath: '/tmp/demo',
      status: 'missing',
      ok: false,
      canRecreate: true,
      checkedAtIso: '2026-01-01T00:00:00.000Z',
    };
    expect(enrichActiveCodeProjectWithFolderHealth(basePayload, health)).toEqual(basePayload);
  });

  it('adds folderRootOk true when health is ok', () => {
    const health: CodeProjectRootHealth = {
      projectId: 'p1',
      rootPath: '/tmp/demo',
      status: 'ok',
      ok: true,
      canRecreate: false,
      checkedAtIso: '2026-01-01T00:00:00.000Z',
    };
    expect(enrichActiveCodeProjectWithFolderHealth(basePayload, health)).toEqual({
      ...basePayload,
      folderRootOk: true,
    });
  });

  it('adds folderRootOk false and status when folder is missing', () => {
    const health: CodeProjectRootHealth = {
      projectId: 'p1',
      rootPath: '/tmp/demo',
      status: 'missing',
      ok: false,
      canRecreate: true,
      checkedAtIso: '2026-01-01T00:00:00.000Z',
    };
    expect(enrichActiveCodeProjectWithFolderHealth(basePayload, health)).toEqual({
      ...basePayload,
      folderRootOk: false,
      folderRootStatus: 'missing',
    });
  });
});
