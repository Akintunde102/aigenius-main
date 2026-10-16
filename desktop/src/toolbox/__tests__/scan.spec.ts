import { detectCapabilitiesFromFiles, findSecrets } from '../scan';

describe('toolbox scan', () => {
  it('detects writes-files for writeFileSync when model declared no flags', () => {
    const flags = detectCapabilitiesFromFiles([
      { path: 'main.js', content: "const fs = require('fs'); fs.writeFileSync('out.txt', 'x');" },
    ]);
    expect(flags).toContain('writes-files');
  });

  it('rejects hardcoded secrets unless tb-allow-secret is on the line', () => {
    const bad = findSecrets([
      { path: 'a.js', content: "const api_key = 'sk-abcdefghijklmnopqrstuvwxyz';" },
    ]);
    expect(bad.length).toBeGreaterThan(0);
    const ok = findSecrets([
      { path: 'a.js', content: "// tb-allow-secret dummy\nconst api_key = 'sk-test';" },
    ]);
    expect(ok.length).toBe(0);
  });
});
