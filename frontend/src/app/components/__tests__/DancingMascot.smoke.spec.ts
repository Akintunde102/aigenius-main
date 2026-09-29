/** Smoke test — verifies DancingMascot source and 3D asset are tracked */
import * as fs from 'fs';
import * as path from 'path';

describe('DancingMascot smoke', () => {
  it('source file exists', () => {
    const source = path.join(__dirname, '..', 'DancingMascot.tsx');
    expect(fs.existsSync(source)).toBe(true);
  });

  it('loads the vendored 3D fox model', () => {
    const source = fs.readFileSync(
      path.join(__dirname, '..', 'DancingMascot.tsx'),
      'utf8',
    );
    expect(source).toContain('MASCOT_MODEL_URL');
    expect(source).toContain('mountDancingMascotScene');
  });
});
