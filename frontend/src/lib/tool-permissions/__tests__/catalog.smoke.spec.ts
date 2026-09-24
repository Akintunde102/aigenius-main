import { getCatalogEntry } from '../catalog';

describe('tool permission catalog', () => {
  it('does not require a confirmation dialog before creating a desktop project', () => {
    expect(getCatalogEntry('local_create_project')?.defaultRequiresApproval).toBe(false);
  });

  it('does not require a confirmation dialog before shell commands', () => {
    expect(getCatalogEntry('local_shell')?.defaultRequiresApproval).toBe(false);
    expect(getCatalogEntry('run_command')?.defaultRequiresApproval).toBe(false);
  });

  it('still asks before applying file patches by default', () => {
    expect(getCatalogEntry('local_apply_patch')?.defaultRequiresApproval).toBe(true);
  });

  it('does not require approval for Google image search', () => {
    expect(getCatalogEntry('serper_google_images')?.defaultRequiresApproval).toBe(false);
  });

  it('asks before hosting Markdown pages', () => {
    expect(getCatalogEntry('host_markdown')?.defaultRequiresApproval).toBe(true);
  });
});
