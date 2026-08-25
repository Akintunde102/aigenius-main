
import { generateRandomProjectName } from './random-project-name';

describe('generateRandomProjectName', () => {
  it('returns a hyphenated name with a numeric suffix', () => {
    const name = generateRandomProjectName();
    expect(name).toMatch(/^[a-z]+-[a-z]+-\d{2}$/);
  });

  it('generates different names across calls', () => {
    const names = new Set(Array.from({ length: 20 }, () => generateRandomProjectName()));
    expect(names.size).toBeGreaterThan(1);
  });
});
