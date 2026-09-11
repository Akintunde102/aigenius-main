import { isIgnored, isIgnoredUnderRoot } from './exemptions';
import path from 'path';

describe('Exemption Logic', () => {
  it('identifies AppData as ignored', () => {
    expect(isIgnored('C:\\Users\\User\\AppData\\Local\\Temp')).toBe(true);
    expect(isIgnored('c:/users/user/appdata/local/temp')).toBe(true);
  });

  it('identifies node_modules as ignored', () => {
    expect(isIgnored('project/node_modules/package/index.js')).toBe(true);
    expect(isIgnored('C:\\project\\node_modules\\lib\\index.js')).toBe(true);
  });

  it('does not ignore regular project files', () => {
    expect(isIgnored('project/src/index.ts')).toBe(false);
    expect(isIgnored('C:\\project\\src\\main.ts')).toBe(false);
  });

  it('is case-insensitive', () => {
    expect(isIgnored('c:\\users\\APPDATA\\local')).toBe(true);
    expect(isIgnored('C:\\USERS\\appdata\\LOCAL')).toBe(true);
  });

  it('does not skip children of a listed folder just because an ancestor is AppData', () => {
    const root = 'C:\\Users\\User\\AppData\\Local\\Temp\\list-dir';
    expect(isIgnoredUnderRoot(root, path.join(root, 'alpha.txt'))).toBe(false);
    expect(isIgnoredUnderRoot(root, path.join(root, 'node_modules', 'left-pad'))).toBe(true);
  });
});
