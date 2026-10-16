import { isToolboxTool, handleToolboxTool } from '../executor';

jest.mock('electron', () => ({
  app: { getPath: () => require('os').tmpdir() },
}));

describe('handleToolboxTool', () => {
  it('maps the four toolbox names', () => {
    expect(isToolboxTool('local_toolbox_search')).toBe(true);
    expect(isToolboxTool('local_toolbox_get')).toBe(true);
    expect(isToolboxTool('local_toolbox_run')).toBe(true);
    expect(isToolboxTool('local_toolbox_save')).toBe(true);
    expect(isToolboxTool('local_shell')).toBe(false);
  });

  it('does not throw on invalid search args', async () => {
    const out = await handleToolboxTool(undefined, 'local_toolbox_search', {});
    expect(out.ok).toBe(false);
  });
});
