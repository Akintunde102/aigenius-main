import { resolveReadFilePath } from './path-resolver';

jest.mock('../../active-code-project', () => ({
  getActiveCodeProjectRootPath: () => '/tmp/missing-project-root',
  getActiveCodeProjectId: () => 'project-1',
}));

jest.mock('../../check-code-project-root-path', () => ({
  checkCodeProjectRootPath: jest.fn(async () => ({
    ok: false,
    status: 'missing',
    canRecreate: true,
  })),
}));

describe('resolveReadFilePath with missing active project folder', () => {
  it('blocks relative reads instead of falling back to home', async () => {
    const result = await resolveReadFilePath('src/index.ts');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/project folder is missing/i);
    }
  });
});
