/** Smoke test — verifies source is tracked; extend with behavior tests. */
import * as fs from 'fs';
import * as path from 'path';

describe('main-application-menu smoke', () => {
  it('source file exists', () => {
    const source = path.join(__dirname, '..', 'main-application-menu.ts');
    expect(fs.existsSync(source)).toBe(true);
  });

  it('contains contact support, terms of service, and privacy policy', () => {
    const sourceContent = fs.readFileSync(path.join(__dirname, '..', 'main-application-menu.ts'), 'utf8');
    expect(sourceContent).toContain('Contact Support');
    expect(sourceContent).toContain('Terms of Service');
    expect(sourceContent).toContain('Privacy Policy');
    expect(sourceContent).toContain('nobox.hq@gmail.com');
  });
});
